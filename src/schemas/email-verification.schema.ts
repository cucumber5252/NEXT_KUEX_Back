import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({
  timestamps: true, // createdAt, updatedAt 자동 생성
})
export class EmailVerification {
  @Prop({
    required: true,
    unique: true, // 같은 이메일로 여러 인증코드 생성 방지
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._-]+@korea\.ac\.kr$/,
      '올바른 고려대학교 이메일 형식이 아닙니다.',
    ],
  })
  email: string;

  @Prop({
    required: true,
    length: 6,
    match: [/^\d{6}$/, '인증번호는 6자리 숫자여야 합니다.'],
  })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);

// 복합 인덱스 및 TTL 인덱스 수동 등록
EmailVerificationSchema.index({ email: 1, verified: 1 });
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
