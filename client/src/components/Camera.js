import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

const Camera = () => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [filter, setFilter] = useState("none");

  const filters = {
    none: "none",
    retro: "sepia(0.8) contrast(1.2)",
    upsideDown: "invert(1) hue-rotate(180deg)",
    neon: "saturate(3) hue-rotate(-20deg)"
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  return (
    <div className="container mt-5 pt-5 text-center">
      <div className="card p-3 mx-auto shadow-lg" style={{ maxWidth: "600px" }}>
        <h3 className="text-white mb-3">Hawkins Cam</h3>
        <div className="position-relative mb-3">
            {imgSrc ? (
                <img src={imgSrc} alt="Captured" className="w-100 rounded" style={{ filter: filters[filter] }} />
            ) : (
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-100 rounded" style={{ filter: filters[filter] }} />
            )}
        </div>
        <div className="btn-group mb-3">
            {Object.keys(filters).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className="btn btn-outline-light btn-sm">{f.toUpperCase()}</button>
            ))}
        </div>
        {!imgSrc ? (
            <button onClick={capture} className="btn btn-danger w-100">Capture</button>
        ) : (
            <div className="d-flex gap-2">
                <button onClick={() => setImgSrc(null)} className="btn btn-outline-light w-50">Retake</button>
                <a href={imgSrc} download="nexus.jpg" className="btn btn-success w-50">Download</a>
            </div>
        )}
      </div>
    </div>
  );
};

export default Camera;