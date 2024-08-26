import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Device from 'expo-device';

const QRCodeGenerator = () => {
  const [deviceId, setDeviceId] = useState('');
  const [qrValue, setQrValue] = useState('');

  // Function to jumble the device ID
  const jumbleString = (str) => {
    return str.split('').sort(() => Math.random() - 0.5).join('');
  };

  useEffect(() => {
    const fetchDeviceId = async () => {
      const id = Device.osInternalBuildId || Device.osBuildId || 'Unknown Device ID';
      setDeviceId(id);
      setQrValue(jumbleString(id)); // Set the initial jumbled device ID
    };

    fetchDeviceId();

    // Function to update the QR code value every 5 minutes
    const intervalId = setInterval(() => {
      setQrValue(jumbleString(deviceId));
    }, 5 * 60 * 10); // 5 minutes

    return () => clearInterval(intervalId); // Clear the interval on component unmount
  }, [deviceId]);

  return (
    <View style={styles.container}>
      {qrValue ? (
        <>
          
          <QRCode value={qrValue} size={200} />
        </>
      ) : (
        <Text style={styles.placeholder}>Generating QR code...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
});

export default QRCodeGenerator;
