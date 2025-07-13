import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  EmailVerification,
  EmailVerificationSchema,
} from 'src/schemas/email-verification.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from 'src/schemas/password-reset-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
