import Joi from 'joi';
import { password } from './custom.validation.ts';

const firebaseRegister = Joi.object().keys({
  idToken: Joi.string().required(),
  fullName: Joi.string().allow('').optional(),
}).unknown(false);

const legacyRegister = Joi.object().keys({
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  fullName: Joi.string().required(),
  role: Joi.string().optional().valid('client', 'employee', 'admin'),
  phoneNumber: Joi.string().optional(),
  address: Joi.string().optional(),
  dateOfBirth: Joi.alternatives().try(Joi.string(), Joi.date()).optional(),
}).unknown(false);

const register = {
  body: Joi.alternatives().try(firebaseRegister, legacyRegister),
};

const firebaseLogin = Joi.object().keys({
  idToken: Joi.string().required(),
}).unknown(false);

const legacyLogin = Joi.object().keys({
  email: Joi.string().required(),
  password: Joi.string().required(),
}).unknown(false);

const login = {
  body: Joi.alternatives().try(firebaseLogin, legacyLogin),
};

const logout = {
  body: Joi.object()
    .keys({
      refreshToken: Joi.string().required(),
    })
    .unknown(false),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }).unknown(false),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
    email: Joi.string().required(),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required().custom(password),
    newPassword: Joi.string().required().custom(password),
  }),
};

const firebaseVerifyEmail = Joi.object().keys({
  idToken: Joi.string().required(),
}).unknown(false);

const legacyVerifyEmail = Joi.object().keys({
  email: Joi.string().required().email(),
  oneTimeCode: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
}).unknown(false);

const verifyEmail = {
  body: Joi.alternatives().try(firebaseVerifyEmail, legacyVerifyEmail),
};

const resendVerification = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const deleteMe = {
  body: Joi.object().keys({
    password: Joi.string().allow('').optional().custom(password),
  }),
};

export default {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteMe,
  changePassword,
};

export { register, login, logout, refreshTokens, forgotPassword, resetPassword, verifyEmail, resendVerification, deleteMe, changePassword };
