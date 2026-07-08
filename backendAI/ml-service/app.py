from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from PIL import Image
import io
import os
import warnings
import logging
import gc

app = Flask(__name__)
CORS(app)

warnings.filterwarnings(
    "ignore",
    message="Trying to unpickle estimator.*"
)

logging.getLogger("werkzeug").setLevel(logging.ERROR)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# Xác định đường dẫn tuyệt đối dựa trên vị trí file app.py để tránh trỏ sai vị trí trên Render
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "ml-models")

diabetes_model = None
stroke_model = None
malaria_interpreter = None
pneumonia_interpreter = None

def load_pkl(path):
    with open(path, "rb") as f:
        return pickle.load(f)

# Hàm phụ trợ khởi tạo môi trường chạy mô hình TFLite nhẹ
def load_tflite(path):
    interpreter = tf.lite.Interpreter(model_path=path)
    interpreter.allocate_tensors()
    return interpreter

# Hàm phụ trợ thực thi dự đoán với TFLite
def predict_tflite(interpreter, input_data):
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Ép dữ liệu đầu vào về định dạng float32 phù hợp với cấu trúc TFLite
    interpreter.set_tensor(input_details[0]['index'], input_data.astype(np.float32))
    interpreter.invoke()
    
    output_data = interpreter.get_tensor(output_details[0]['index'])
    return output_data

def load_models():
    global diabetes_model, stroke_model, malaria_interpreter, pneumonia_interpreter

    try:
        diabetes_model = load_pkl(os.path.join(MODELS_DIR, "diabetes.pkl"))
        print("Diabetes model loaded.")
    except Exception as e:
        print(f"Warning: could not load diabetes model: {e}")

    try:
        stroke_model = joblib.load(os.path.join(MODELS_DIR, "stroke_model.joblib"))
        print("Stroke model loaded.")
    except Exception as e:
        print(f"Warning: could not load stroke model: {e}")

    try:
        malaria_interpreter = load_tflite(os.path.join(MODELS_DIR, "malaria.tflite"))
        print("Malaria TFLite model loaded.")
    except Exception as e:
        print(f"Warning: could not load malaria model: {e}")

    try:
        pneumonia_interpreter = load_tflite(os.path.join(MODELS_DIR, "pneumonia.tflite"))
        print("Pneumonia TFLite model loaded.")
    except Exception as e:
        print(f"Warning: could not load pneumonia model: {e}")

load_models()

@app.route("/", methods=["GET"])
def index():
    return "AI API Working"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "diabetes": diabetes_model is not None,
            "stroke": stroke_model is not None,
            "malaria": malaria_interpreter is not None,
            "pneumonia": pneumonia_interpreter is not None,
        },
    })

# ===== DIABETES =====
@app.route("/api/diagnosis/diabetes", methods=["POST"])
def predict_diabetes():
    if diabetes_model is None:
        return jsonify({"message": "Diabetes model not loaded"}), 503

    data = request.get_json()
    try:
        features = np.array([[
            float(data["pregnancies"]),
            float(data["glucose"]),
            float(data["bloodpressure"]),
            float(data["skinthickness"]),
            float(data["insulin"]),
            float(data["bmi"]),
            float(data["dpf"]),
            float(data["age"]),
        ]])
        pred = diabetes_model.predict(features)[0]
        
        gc.collect()  # Gom rác giải phóng RAM thừa
        return jsonify({"pred": int(pred)})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

# ===== MALARIA (ảnh) =====
@app.route("/api/diagnosis/malaria", methods=["POST"])
def predict_malaria():
    if malaria_interpreter is None:
        return jsonify({"message": "Malaria model not loaded"}), 503

    if "image" not in request.files:
        return jsonify({"message": "No image uploaded"}), 400

    try:
        file = request.files["image"]
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
        img = img.resize((36, 36))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Sử dụng TFLite interpreter để xử lý dự đoán
        prediction = predict_tflite(malaria_interpreter, img_array)
        print("Raw prediction:", prediction)

        if prediction.shape[-1] == 1:
            pred = int(prediction[0][0] > 0.5)
        else:
            pred = int(np.argmax(prediction, axis=1)[0])

        # Thực thi dọn dẹp các mảng dữ liệu trung gian và xóa cache phiên làm việc của TF
        tf.keras.backend.clear_session()
        del img, img_array, prediction
        gc.collect()

        return jsonify({"pred": pred})
    except Exception as e:
        tf.keras.backend.clear_session()
        gc.collect()
        return jsonify({"message": str(e)}), 500

# ===== PNEUMONIA (ảnh) =====
@app.route("/api/diagnosis/pneumonia", methods=["POST"])
def predict_pneumonia():
    if pneumonia_interpreter is None:
        return jsonify({"message": "Pneumonia model not loaded"}), 503

    if "image" not in request.files:
        return jsonify({"message": "No image uploaded"}), 400

    try:
        file = request.files["image"]
        img = Image.open(io.BytesIO(file.read())).convert("L")
        img = img.resize((36, 36))
        
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=-1)
        img_array = np.expand_dims(img_array, axis=0)

        print("Input shape:", img_array.shape)

        # Sử dụng TFLite interpreter để xử lý dự đoán
        prediction = predict_tflite(pneumonia_interpreter, img_array)
        print("Prediction:", prediction)

        if prediction.shape[-1] == 1:
            pred = int(prediction[0][0] > 0.5)
            confidence = float(prediction[0][0])
        else:
            pred = int(np.argmax(prediction, axis=1)[0])
            confidence = float(np.max(prediction))

        # Thực thi dọn dẹp các mảng dữ liệu trung gian và xóa cache phiên làm việc của TF
        tf.keras.backend.clear_session()
        del img, img_array, prediction
        gc.collect()

        return jsonify({
            "pred": pred,
            "confidence": confidence
        })
    except Exception as e:
        tf.keras.backend.clear_session()
        gc.collect()
        return jsonify({"message": str(e)}), 500

# ===== STROKE =====
WORK_TYPE_MAPPING = {
    "Government job": "Govt_job",
    "Children": "children",
    "Never Worked": "Never_worked",
    "Private": "Private",
    "Self-employed": "Self-employed",
}

def predict_stroke_input(single_input):
    input_df = pd.DataFrame([single_input])
    encoded_cols = stroke_model["encoded_cols"]
    numeric_cols = stroke_model["numeric_cols"]
    preprocessor = stroke_model["preprocessor"]

    input_df[encoded_cols] = preprocessor.transform(input_df)
    X = input_df[numeric_cols + encoded_cols]
    prediction = stroke_model["model"].predict(X)
    return prediction

@app.route("/api/diagnosis/stroke", methods=["POST"])
def predict_stroke():
    if stroke_model is None:
        return jsonify({"message": "Stroke model not loaded"}), 503

    data = request.get_json()
    try:
        gender = data["gender"].lower()
        ever_married = data["ever_married"].lower()
        smoking_status_raw = data["smoking_status"]
        smoking_status = (
            smoking_status_raw.lower()
            if smoking_status_raw != "Unknown"
            else smoking_status_raw
        )
        work_type = WORK_TYPE_MAPPING[data["work_type"]]

        single_input = {
            "gender": gender,
            "age": float(data["age"]),
            "hypertension": int(data["hypertension"]),
            "heart_disease": int(data["heart_disease"]),
            "ever_married": ever_married,
            "work_type": work_type,
            "Residence_type": data["residence_type"],
            "avg_glucose_level": float(data["avg_glucose_level"]),
            "bmi": float(data["bmi"]),
            "smoking_status": smoking_status,
        }

        prediction = predict_stroke_input(single_input)
        
        gc.collect()  # Gom rác giải phóng RAM thừa
        return jsonify({"pred": int(prediction[0])})
    except KeyError as e:
        return jsonify({"message": f"Missing or invalid field: {e}"}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4001))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
        use_reloader=False
    )