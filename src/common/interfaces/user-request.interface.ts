/* eslint-disable prettier/prettier */

import { Request } from 'express';

export interface UserRequest extends Request {
  user?: IUser;
}

export interface IUser {
  user_id: string;
  username: string;
  role?: string;
}
