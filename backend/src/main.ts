import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost,http://localhost:5173')
    .split(',')
    .map(o => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(o => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '7654', 10);
  await app.listen(port);
  const url = await app.getUrl();
  console.log(`🚀 Mail Catcher running on ${url}`);
}
bootstrap().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
