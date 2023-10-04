import React, { useState } from 'react';
import axios from 'axios';
// import { Container, Button, Grid, Typography, Paper, TextField } from '@mui/material';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Grid,
  TextField,
} from '@mui/material';

const UploadForm = () => {
  const [files, setFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [resetClicked, setResetClicked] = useState(false);

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
      await axios.post('https://site--health-project--dtyj44glkjlz.code.run/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFiles([])
      alert('Files uploaded successfully.');
      setResetClicked(false);
    } catch (error) {
      console.error(error);
      alert('Error uploading files.');
    }
  };

  const getPredictions = async () => {
    try {
      const response = await axios.get('https://site--health-project--dtyj44glkjlz.code.run/average/someday'); // Replace 'someday' with the desired day
      setPredictions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const resetData = async () => {
    try {
      await axios.delete('https://site--health-project--dtyj44glkjlz.code.run/reset');
      alert('Data reset successfully.');
      setPredictions([]);
      setResetClicked(true);
    } catch (error) {
      console.error(error);
      alert('Error resetting data.');
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Typography variant="h4" align="center">
              Heartbeat Prediction App
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="file"
              variant="outlined"
              onChange={onFileChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{ inputProps: { multiple: true } }}
            />
          </Grid>
          <Grid item xs={12} container justifyContent="center">
            <Button variant="contained" color="primary" onClick={uploadFiles}>
              Upload Files
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={resetData}
              style={{ marginLeft: '10px' }}
              disabled={resetClicked}
            >
              Reset Data
            </Button>
          </Grid>
          <Grid item xs={12} container justifyContent="center">
            <Button variant="contained" color="primary" onClick={getPredictions}>
              See Prediction
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {predictions.length > 0 && (
        <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
          <Typography variant="h5">Predictions</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Average Heartbeat Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.map((prediction, index) => (
                  <TableRow key={index}>
                    <TableCell>{prediction?._id?.day}</TableCell>
                    <TableCell>{Math.ceil(prediction.averageHeartRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

  // return (
  //   <Container maxWidth="md">
  //     <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
  //       <Grid container spacing={2} alignItems="center">
  //         <Grid item xs={12}>
  //           <Typography variant="h4" align="center">
  //             Heartbeat Prediction App
  //           </Typography>
  //         </Grid>
  //         <Grid item xs={12}>
  //           <TextField
  //             fullWidth
  //             type="file"
  //             variant="outlined"
  //             onChange={onFileChange}
  //             InputLabelProps={{ shrink: true }}
  //             InputProps={{ inputProps: { multiple: true } }}
  //           />
  //         </Grid>
  //         <Grid item xs={12} container justifyContent="center">
  //           <Button variant="contained" color="primary" onClick={uploadFiles}>
  //             Upload Files
  //           </Button>
  //           <Button
  //             variant="contained"
  //             color="secondary"
  //             onClick={resetData}
  //             style={{ marginLeft: '10px' }}
  //             disabled={resetClicked}
  //           >
  //             Reset Data
  //           </Button>
  //         </Grid>
  //         <Grid item xs={12} container justifyContent="center">
  //           <Button variant="contained" color="primary" onClick={getPredictions}>
  //             See Prediction
  //           </Button>
  //         </Grid>
  //       </Grid>
  //     </Paper>

  //     {predictions.length > 0 && (
  //       <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
  //         <Typography variant="h5">Predictions</Typography>
  //         <table style={{ width: '100%', marginTop: '10px' }}>
  //           <thead>
  //             <tr>
  //               <th>Day</th>
  //               <th>Average Heartbeat Count</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {predictions.map((prediction, index) => (
  //               <tr key={index}>
  //                 <td>{prediction?._id?.day}</td>
  //                 <td>{prediction.averageHeartRate}</td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       </Paper>
  //     )}
  //   </Container>
  // );
// };

export default UploadForm;
