import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from '../email/email.module';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtAccessSecret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!jwtAccessSecret) {
          throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
        }
        return {
          secret: jwtAccessSecret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m') as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    EmailModule,
    I18nModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
