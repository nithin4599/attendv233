import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert, Animated, LogBox } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { ref, set, get } from 'firebase/database';
import LottieView from 'lottie-react-native';
import * as Device from 'expo-device';

// Ignore Firebase Auth warning
LogBox.ignoreLogs(['@firebase/auth: Auth (10.13.0)']);

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [opacity] = useState(new Animated.Value(0));
  const deviceId = Device.osBuildId; // Unique device identifier

  const handleSignup = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const userRef = ref(db, 'users/' + user.uid);
        
        // Set user data in Firebase Realtime Database
        set(userRef, {
          email: user.email,
          deviceId: deviceId, // Save the device ID
        }).then(() => {
          // Check if device ID is different
          get(userRef).then((snapshot) => {
            const userData = snapshot.val();
            if (userData.deviceId && userData.deviceId !== deviceId) {
              Alert.alert("Signup Successful", "Please log in using the correct device.");
            } else {
              Alert.alert("Signup Successful", "Sign up successful. Now go to the login page.", [
                { text: "OK", onPress: () => navigation.navigate('Login') }
              ]);
            }
          }).catch((error) => {
            Alert.alert("Error", error.message);
          });
        }).catch((error) => {
          Alert.alert("Error", error.message);
        });

      })
      .catch((error) => {
        Alert.alert("Signup Failed", error.message);
      });
  };

  Animated.timing(opacity, {
    toValue: 1,
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
      <Animated.View style={[styles.inputContainer, { opacity }]}>
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
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginButtonText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F618D',
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
    backgroundColor: '#21618C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
  },
  loginButton: {
    marginTop: 15,
  },
  loginButtonText: {
    color: '#AED6F1',
    fontSize: 16,
  },
});
