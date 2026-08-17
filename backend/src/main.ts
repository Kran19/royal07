import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

// Load .env explicitly for main.ts
dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: true,
      rawBody: true, // Enable rawBody for RSA signature verification
    });
    
    // Increase body limits for large image uploads
    const { json, urlencoded } = require('express');
    app.use(json({ limit: '100mb' }));
    app.use(urlencoded({ limit: '100mb', extended: true }));
    
    logger.log('✅ Nest Application Created with 100MB limits');
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    logger.log('🛠️ Global Validation Pipe Enabled');
    
    // Use dynamic origin reflection to solve Ngrok CORS issues forever
    app.enableCors({
      origin: true,
      credentials: true,
    });
    logger.log('🌐 Dynamic CORS Enabled');

    // Setup Redis WebSocket Adapter for Production Cluster Scalability
    const redisIoAdapter = new RedisIoAdapter(app);
    const redisConnected = await redisIoAdapter.connectToRedis();
    if (redisConnected) {
      app.useWebSocketAdapter(redisIoAdapter);
    }

    const port = process.env.PORT || 4000;
    logger.log(`📡 Attempting to listen on port ${port}...`);
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 RoyalBet Engine running on: http://127.0.0.1:${port}`);
  } catch (error) {
    logger.error('❌ Failed to start RoyalBet Engine:', error);
    process.exit(1);
  }
}
bootstrap();
