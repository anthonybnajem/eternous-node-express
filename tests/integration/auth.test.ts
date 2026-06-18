import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.ts';
import { connectDB, closeDB } from '../../src/config/database.ts';
import User from '../../src/models/user.model.ts';

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

    test('should return 201 and successfully register user if request data is ok', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);

      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).toEqual({
        id: expect.anything(),
        fullName: newUser.fullName,
        email: newUser.email,
        role: 'user',
        isEmailVerified: false,
        isActive: true,
        isDeleted: false,
        createdAt: expect.anything(),
      });

      const dbUser = await User.findById(res.body.user.id);
      expect(dbUser).not.toBeNull();
      if (!dbUser) {
        throw new Error('Expected user to exist');
      }
      expect(dbUser.password).not.toBe(newUser.password);
      expect(dbUser).toMatchObject({
        fullName: newUser.fullName,
        email: newUser.email,
        role: 'user',
      });

      expect(res.body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() },
      });
    });

    test('should return 400 error if email is invalid', async () => {
      newUser.email = 'invalidEmail';

      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if email is already used', async () => {
      await User.create(newUser);

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
    test('should return 200 and login user if email and password match', async () => {
      const newUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      await User.create(newUser);

      const loginCredentials = {
        email: newUser.email,
        password: newUser.password,
      };

      const res = await request(app).post('/api/v1/auth/login').send(loginCredentials).expect(httpStatus.OK);

      expect(res.body.user).toEqual({
        id: expect.anything(),
        fullName: newUser.fullName,
        email: newUser.email,
        role: 'user',
        isEmailVerified: false,
        isActive: true,
        isDeleted: false,
        createdAt: expect.anything(),
      });

      expect(res.body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() },
      });
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
      const newUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      await User.create(newUser);

      const loginCredentials = {
        email: newUser.email,
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
