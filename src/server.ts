import app from './app';
import { db } from './database/index';
import { config } from './config';

async function start(): Promise<void> {
  await db.initialize();

  const server = app.listen(config.port, () => {
    console.log(`서버가 포트 ${config.port}에서 시작되었습니다`);
  });

  const shutdown = async () => {
    console.log('서버를 종료합니다...');
    server.close(async () => {
      await db.close();
      console.log('데이터베이스 연결이 종료되었습니다');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
