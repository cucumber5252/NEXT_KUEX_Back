import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';
import { SignJWT } from 'jose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  EmailRequestDto,
  EmailVerifyDto,
  LoginDto,
  RegisterDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  PasswordResetValidateDto,
} from 'src/auth/auth.dto';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  EmailVerification,
  EmailVerificationDocument,
} from 'src/schemas/email-verification.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from 'src/schemas/password-reset-token.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  async requestEmail(dto: EmailRequestDto) {
    const email = dto.email;
    if (!/^[a-zA-Z0-9._-]+@korea\.ac\.kr$/.test(email)) {
      throw new BadRequestException('잘못된 이메일 형식입니다.');
    }

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser)
      throw new BadRequestException('이미 등록된 이메일입니다.');

    const recent = await this.emailVerificationModel.findOne({
      email,
      createdAt: { $gte: new Date(Date.now() - 60000) },
    });
    if (recent) throw new BadRequestException('잠시 후 다시 요청해주세요.');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000);

    await this.emailVerificationModel.deleteMany({ email });
    await this.emailVerificationModel.create({
      email,
      code,
      expiresAt,
      verified: false,
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      return { debug: { code } };

    const transporter = createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: { name: 'KU:EX', address: process.env.EMAIL_USER },
      to: email,
      subject: '[KU:EX] 이메일 인증번호',
      html: `<b>${code}</b>`,
    });
    return { message: '인증번호 전송 완료' };
  }

  async verifyEmail(dto: EmailVerifyDto) {
    const { email, code } = dto;
    const record = await this.emailVerificationModel.findOne({ email });
    if (!record || record.verified)
      throw new BadRequestException('잘못된 요청입니다.');
    if (new Date() > record.expiresAt)
      throw new BadRequestException('인증번호 만료');
    if (record.code !== code) throw new BadRequestException('인증번호 불일치');
    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();
    return { message: '이메일 인증 성공' };
  }

  async register(dto: RegisterDto) {
    const { email, name, password } = dto;
    if (!/^[a-zA-Z0-9._-]+@korea\.ac\.kr$/.test(email))
      throw new BadRequestException('형식 오류');
    const verified = await this.emailVerificationModel.findOne({
      email,
      verified: true,
    });
    if (!verified) throw new BadRequestException('이메일 인증 필요');
    const existing = await this.userModel.findOne({ email });
    if (existing) throw new BadRequestException('이미 존재하는 이메일');
    const hashed = await hash(password, 12);
    const user = await this.userModel.create({ email, name, password: hashed });
    await this.emailVerificationModel.deleteOne({ _id: verified._id });
    return { message: '회원가입 성공', user };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.userModel.findOne({ email });
    if (!user || !(await compare(password, user.password)))
      throw new UnauthorizedException();
    const jwt = await new SignJWT({
      userId: (user._id as any).toString(),
      email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    return { token: jwt, user };
  }

  async logout() {
    return { message: '로그아웃 성공' };
  }

  async requestPasswordReset(dto: PasswordResetRequestDto, baseUrl: string) {
    const { email, name } = dto;

    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
      name: name.trim(),
    });

    if (!user) throw new NotFoundException('일치하는 계정을 찾을 수 없습니다.');

    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    const token = randomBytes(32).toString('hex');
    await this.passwordResetTokenModel.create({ userId: user._id, token });

    const resetUrl = `${baseUrl}/password-reset/confirm?token=${token}`;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return {
        message: '개발 모드: 이메일 발송 없이 토큰 반환',
        ...(process.env.NODE_ENV === 'development' && { resetToken: token }),
      };
    }

    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: { name: 'KU:EX', address: process.env.EMAIL_USER },
      to: email,
      subject: '[KU:EX] 비밀번호 재설정 요청',
      html: `재설정 링크: <a href="${resetUrl}">${resetUrl}</a>`,
    });

    return { message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.' };
  }

  async validateResetToken(dto: PasswordResetValidateDto) {
    const tokenDoc = await this.passwordResetTokenModel.findOne({
      token: dto.token,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc)
      throw new NotFoundException('유효하지 않거나 만료된 토큰입니다.');

    return { message: '유효한 토큰입니다.' };
  }

  async confirmResetPassword(dto: PasswordResetConfirmDto) {
    const { token, newPassword } = dto;

    if (newPassword.length < 8) {
      throw new BadRequestException('비밀번호는 8자 이상이어야 합니다.');
    }

    const tokenDoc = await this.passwordResetTokenModel.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc)
      throw new NotFoundException('유효하지 않거나 만료된 토큰입니다.');

    const user = await this.userModel.findById(tokenDoc.userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const hashed = await hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(user._id, { password: hashed });
    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}
