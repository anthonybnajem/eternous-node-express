import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.ts';
import { connectDB, closeDB } from '../../src/config/database.ts';
import User from '../../src/models/user.model.ts';
import Session from '../../src/models/session.model.ts';
import Token from '../../src/models/token.model.ts';
import { tokenTypes } from '../../src/config/tokens.ts';

const getAuthPayload = (body: Record<string, unknown>) => {
  const data = body.data as {
    attributes?: Record<string, unknown>;
    token?: Record<string, unknown>;
  };
  const attributes = data?.attributes;
  const tokens = data?.token ?? attributes?.tokens;
  return {
    user: attributes?.user,
    tokens,
    requiresEmailVerification: attributes?.requiresEmailVerification,
    message: body.message as string,
  };
};

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await Token.deleteMany({});
});

describe('Auth routes', () => {
  describe('POST /api/v1/auth/register', () => {
    let newUser: {
      fullName: string;
      email: string;
      password: string;
    };

    beforeEach(() => {
      newUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };
    });

    test('should return 201 and register user without tokens until email is verified', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);

      const payload = getAuthPayload(res.body);
      expect(payload.user).toMatchObject({
        fullName: newUser.fullName,
        email: newUser.email,
        role: 'user',
        isEmailVerified: false,
        isActive: true,
        isDeleted: false,
      });
      expect(payload.user).not.toHaveProperty('password');
      expect(payload.requiresEmailVerification).toBe(true);
      expect(payload.tokens).toBeUndefined();

      const dbUser = await User.findById((payload.user as { id: string }).id);
      expect(dbUser).not.toBeNull();
      if (!dbUser) {
        throw new Error('Expected user to exist');
      }
      expect(dbUser.password).not.toBe(newUser.password);
    });

    test('should return 400 error if email is invalid', async () => {
      newUser.email = 'invalidEmail';

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if email is already used', async () => {
      await User.create({ ...newUser, isEmailVerified: true });

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if password length is less than 8 characters', async () => {
      newUser.password = 'Pass1!';

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if password does not contain both letters and numbers', async () => {
      newUser.password = 'password';

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);

      newUser.password = '11111111';

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should return 200 and login verified user if email and password match', async () => {
      const newUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        isEmailVerified: true,
      };

      await User.create(newUser);

      const loginCredentials = {
        email: newUser.email,
        password: newUser.password,
      };

      const res = await request(app).post('/api/v1/auth/login').send(loginCredentials).expect(httpStatus.OK);

      const payload = getAuthPayload(res.body);
      expect(payload.user).toMatchObject({
        fullName: newUser.fullName,
        email: newUser.email,
        role: 'user',
        isEmailVerified: true,
        isActive: true,
        isDeleted: false,
      });

      expect(payload.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() },
      });
    });

    test('should return 400 if email is not verified', async () => {
      await User.create({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        isEmailVerified: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBe('Email not verified');
    });

    test('should return 401 error if there are no users with that email', async () => {
      const loginCredentials = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const res = await request(app).post('/api/v1/auth/login').send(loginCredentials).expect(httpStatus.UNAUTHORIZED);

      expect(res.body).toEqual({
        code: httpStatus.UNAUTHORIZED,
        message: 'Incorrect email or password',
      });
    });

    test('should return 401 error if password is wrong', async () => {
      await User.create({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        isEmailVerified: true,
      });

      const loginCredentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const res = await request(app).post('/api/v1/auth/login').send(loginCredentials).expect(httpStatus.UNAUTHORIZED);

      expect(res.body).toEqual({
        code: httpStatus.UNAUTHORIZED,
        message: 'Incorrect email or password',
      });
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    test('should change password, revoke old refresh token, and allow login with new password', async () => {
      const credentials = {
        fullName: 'Test User',
        email: 'change@example.com',
        password: 'Password123!',
        isEmailVerified: true,
      };

      await User.create(credentials);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(httpStatus.OK);

      const loginPayload = getAuthPayload(loginRes.body);
      const accessToken = (loginPayload.tokens as { access: { token: string } }).access.token;
      const refreshToken = (loginPayload.tokens as { refresh: { token: string } }).refresh.token;

      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: credentials.password, newPassword: 'NewPassword123!' })
        .expect(httpStatus.OK);

      const dbUser = await User.findOne({ email: credentials.email });
      expect(dbUser).not.toBeNull();
      if (!dbUser) {
        throw new Error('Expected user to exist');
      }
      expect(await dbUser.isPasswordMatch('NewPassword123!')).toBe(true);
      expect(dbUser.password).not.toBe(credentials.password);

      await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken })
        .expect(httpStatus.UNAUTHORIZED);

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: 'NewPassword123!' })
        .expect(httpStatus.OK);
    });
  });

  describe('POST /api/v1/auth/login sessions', () => {
    test('should create Session docs and link refresh tokens on login', async () => {
      const credentials = {
        fullName: 'Session User',
        email: 'session@example.com',
        password: 'Password123!',
        isEmailVerified: true,
      };

      await User.create(credentials);

      await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'JestTest/Chrome')
        .send({ email: credentials.email, password: credentials.password })
        .expect(httpStatus.OK);

      await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'JestTest/Safari')
        .send({ email: credentials.email, password: credentials.password })
        .expect(httpStatus.OK);

      const user = await User.findOne({ email: credentials.email });
      expect(user).not.toBeNull();
      if (!user) {
        throw new Error('Expected user to exist');
      }

      const sessions = await Session.find({ userId: user.id, isActive: true });
      expect(sessions).toHaveLength(2);

      const refreshTokens = await Token.find({
        user: user.id,
        type: tokenTypes.REFRESH,
        blacklisted: false,
      });
      expect(refreshTokens).toHaveLength(2);
      expect(refreshTokens.every((doc) => doc.sessionId)).toBe(true);
    });
  });
});
