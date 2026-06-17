import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from './config';
import { tokenTypes } from './tokens';
import User from '../models/user.model';
import type { UserDocument } from '../models/user.model';
import type { AuthTokenPayload } from '../types/auth';

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload: AuthTokenPayload, done: (err: unknown, user?: UserDocument | false) => void): Promise<void> => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      done(null, false);
      return;
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

export { jwtStrategy };
export default jwtStrategy;
