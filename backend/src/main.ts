import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '7654', 10);
  await app.listen(port);
  const url = await app.getUrl();
  console.log(`🚀 Mail Testing System running on ${url}`);
}
bootstrap().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
