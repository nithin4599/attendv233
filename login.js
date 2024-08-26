import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert, Animated, Modal, LogBox } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import LottieView from 'lottie-react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { ref, set, get } from 'firebase/database';
import QRCode from 'react-native-qrcode-svg';

// Ignore Firebase Auth warning
LogBox.ignoreLogs(['@firebase/auth: Auth (10.13.0)']);

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [translateY] = useState(new Animated.Value(0));
  const [modalVisible, setModalVisible] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [isWithinRange, setIsWithinRange] = useState(false);
  const intervalRef = useRef(null);
  const deviceId = Device.osBuildId; // Unique device identifier

  const targetLatitude = 13.068252;
  const targetLongitude = 77.648128;
  const allowedDistance = 200; // Distance in meters

  const jumbleString = (str) => {
    return str.split('').sort(() => Math.random() - 0.5).join('');
  };

  const generateQrValue = () => {
    const jumbledUid = jumbleString(deviceId);
    return `Email: ${email}, UID: ${jumbledUid}`;
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleLogin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const distance = getDistanceFromLatLonInMeters(latitude, longitude, targetLatitude, targetLongitude);

      if (distance > allowedDistance) {
        Alert.alert('Location Error', 'You are out of range for QR code generation.');
        return;
      }

      setIsWithinRange(true);

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          const userRef = ref(db, `users/${email.replace('.', '_')}`); // Use email as folder name

          get(userRef).then((snapshot) => {
            const jumbledUid = jumbleString(deviceId); // Generate jumbled UID

            if (snapshot.exists()) {
              const userData = snapshot.val();

              // Check if the device ID matches
              if (userData.deviceId && userData.deviceId !== deviceId) {
                Alert.alert("Login Failed", "This account is already logged in on another device.");
                return;
              }

              // Update the data with jumbledUid
              set(userRef, {
                originalEmail: user.email,
                originalUid: deviceId,
                jumbledUid: jumbledUid,
              }).then(() => {
                const qrCodeValue = generateQrValue(); // Set the initial QR value with email and jumbled UID
                setQrValue(qrCodeValue);
                setModalVisible(true); // Show the modal

                // Set an interval to update the QR code and Firebase every 2 minutes
                intervalRef.current = setInterval(() => {
                  const newQrValue = generateQrValue();
                  setQrValue(newQrValue);
                  set(userRef, {
                    ...userData,
                    jumbledUid: newQrValue.split(', UID: ')[1], // Update jumbledUid in Firebase
                  });
                }, 120000); // 2 minutes

              }).catch((error) => {
                Alert.alert("Error", error.message);
              });

            } else {
              // If user data doesn't exist, create it with the device ID and jumbledUid
              set(userRef, {
                email: email,
                deviceId: deviceId,
                jumbledUid: jumbledUid,
              }).then(() => {
                const qrCodeValue = generateQrValue(); // Set the initial QR value with email and jumbled UID
                setQrValue(qrCodeValue);
                setModalVisible(true); // Show the modal

                // Set an interval to update the QR code and Firebase every 2 minutes
                intervalRef.current = setInterval(() => {
                  const newQrValue = generateQrValue();
                  setQrValue(newQrValue);
                  set(userRef, {
                    email: email,
                    deviceId: deviceId,
                    jumbledUid: newQrValue.split(', UID: ')[1], // Update jumbledUid in Firebase
                  });
                }, 120000); // 2 minutes

              }).catch((error) => {
                Alert.alert("Error", error.message);
              });
            }
          }).catch((error) => {
            Alert.alert("Error", error.message);
          });

        })
        .catch((error) => {
          Alert.alert("Login Failed", error.message);
        });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  Animated.timing(translateY, {
    toValue: -50,
    duration: 1000,
    useNativeDriver: true,
  }).start();

  return (
    <View style={styles.container}>
      <LottieView
        source={require('./Animation.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      <Animated.View style={[styles.inputContainer, { transform: [{ translateY }] }]}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#A9CCE3"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#A9CCE3"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Your QR Code</Text>
            {qrValue ? (
              <QRCode value={qrValue} size={200} />
            ) : (
              <Text style={styles.placeholder}>Generating QR code...</Text>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2874A6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 300,
    height: 300,
  },
  inputContainer: {
    width: '80%',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#EBF5FB',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    color: '#2E86C1',
    width: '100%',
  },
  button: {
    backgroundColor: '#1B4F72',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
  },
  signupText: {
    color: '#AED6F1',
    fontSize: 16,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background with transparency
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    color: '#999',
  },
});
