import React, { useState } from 'react';
import axios from 'axios';

const UploadForm = () => {
  const [files, setFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const onFileChange = (e) => {
    const selectedFiles = e.target.files;
    // Validate file count
    if (selectedFiles.length <= 3) {
      setFiles(selectedFiles);
    } else {
      alert('You can upload a maximum of 3 files.');
    }
  };

  const uploadFiles = async () => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Files uploaded successfully.');
    } catch (error) {
      console.error(error);
      alert('Error uploading files.');
    }
  };

  const getPredictions = async () => {
    try {
      const response = await axios.get('http://localhost:3001/average/someday'); // Replace 'someday' with the desired day
      setPredictions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <input type="file" onChange={onFileChange} multiple />
      <button onClick={uploadFiles}>Upload Files</button>
      <button onClick={getPredictions}>See Prediction</button>

      {predictions.length > 0 && (
        <div>
          <h2>Predictions</h2>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Average Heartbeat Count</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((prediction, index) => (
                <tr key={index}>
                  <td>{prediction._id}</td>
                  <td>{prediction.averageHeartRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
