import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.ts';
import { connectDB, closeDB } from '../../src/config/database.ts';
import User from '../../src/models/user.model.ts';

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
});
