import { useState, useMemo } from "react";

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export const useFormValidation = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isEmailValid = useMemo(() => {
    if (!email) return true; // Don't show error until user starts typing
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    const requirements = {
      length: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;

    let score = 0;
    let label = "Very Weak";
    let color = "#ff4444";

    if (requirements.length && metRequirements >= 2) {
      score = 1;
      label = "Weak";
      color = "#ff8800";
    }
    if (requirements.length && metRequirements >= 3) {
      score = 2;
      label = "Fair";
      color = "#ffbb00";
    }
    if (requirements.length && metRequirements >= 4) {
      score = 3;
      label = "Good";
      color = "#88cc00";
    }
    if (requirements.length && metRequirements === 5) {
      score = 4;
      label = "Strong";
      color = "#00cc44";
    }

    return { score, label, color, requirements };
  };

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true; // Don't show error until user starts typing
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const validatePassword = (passwordValue: string, minStrength: number = 2): boolean => {
    if (!passwordValue) {
      return false;
    }
    const strength = calculatePasswordStrength(passwordValue);
    return strength.score >= minStrength;
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isEmailValid,
    passwordStrength,
    passwordsMatch,
    validateEmail,
    validatePassword,
    calculatePasswordStrength,
  };
};

