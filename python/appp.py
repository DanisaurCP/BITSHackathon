import cv2
import requests
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import matplotlib.pyplot as plt

# Load your custom-trained fire detection model
model = YOLO('best.pt')  # Make sure best.pt is in the same directory

def detect_fire(image_path):
    # Load image from URL or local path
    if image_path.startswith("http"):
        response = requests.get(image_path)
        img = Image.open(io.BytesIO(response.content)).convert('RGB')
        img = np.array(img)
    else:
        img = cv2.imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Detect objects
    results = model(img)
    
    detected = False

    # Draw bounding boxes and print results
    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            label = model.names[cls].lower()
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            if 'fire' in label or 'smoke' in label:
                detected = True
                # Draw box and label
                cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 0), 2)
                cv2.putText(img, f"{label} {conf:.2f}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
                print(f"🔥 Detected: {label} ({conf:.2f})")

    if not detected:
        print("✅ No fire or smoke detected.")

    # Show result
    plt.imshow(img)
    plt.axis("off")
    plt.title("Detection Result")
    plt.show()

# Run detection on test image
detect_fire("https://wildfiretoday.com/wp-content/uploads/2018/11/Camp_Fire_LANDSAT_CORRECTED_crop_with_attribution.jpg")