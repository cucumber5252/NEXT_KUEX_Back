import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      if ('password' in ret) {
        delete ret.password;
      }
      return ret;
    },
  },
  toObject: {
    transform: (_, ret) => {
      if ('password' in ret) {
        delete ret.password;
      }
      return ret;
    },
  },
})
export class User {
  @Prop({
    required: [true, '이메일은 필수입니다.'],
    unique: true,
    lowercase: true,
    validate: {
      validator: (email: string) => email.endsWith('@korea.ac.kr'),
      message: '고려대학교 이메일(@korea.ac.kr)만 사용할 수 있습니다.',
    },
  })
  email: string;

  @Prop({
    required: [true, '이름은 필수입니다.'],
    trim: true,
  })
  name: string;

  @Prop({
    required: [true, '비밀번호는 필수입니다.'],
    minlength: [8, '비밀번호는 8자 이상이어야 합니다.'],
  })
  password: string;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
