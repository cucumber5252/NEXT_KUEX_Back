export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  email: string;
  name: string;
  password: string;
}

export class EmailRequestDto {
  email: string;
}

export class EmailVerifyDto {
  email: string;
  code: string;
}

export class PasswordResetRequestDto {
  email: string;
  name: string;
}

export class PasswordResetValidateDto {
  token: string;
}

export class PasswordResetConfirmDto {
  token: string;
  newPassword: string;
}
