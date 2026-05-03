import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BetService } from './bet.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { GameLifecycleService, GamePhase } from '../game/game-lifecycle.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class BetGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(BetGateway.name);

  constructor(
    private readonly betService: BetService,
    private readonly jwtService: JwtService,
    private readonly gameLifecycleService: GameLifecycleService
  ) {}

  @SubscribeMessage('place_bet')
  async handlePlaceBet(
    @MessageBody() data: PlaceBetDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 1. Instantly reject if not in BETTING phase (Memory Check for speed)
      const gameState = this.gameLifecycleService.getGameState();
      if (gameState.phase !== GamePhase.BETTING) {
        client.emit('bet_rejected', { message: 'Bets are closed for this round!' });
        return;
      }

      // 2. Extract Token
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.emit('bet_rejected', { message: 'Unauthorized. Please login.' });
        return;
      }

      // 3. Verify Token
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        client.emit('bet_rejected', { message: 'Invalid token.' });
        return;
      }

      // 4. Place Bet
      const result = await this.betService.placeBet(payload.sub, data);

      // 5. Broadcast to all (Social Feed)
      if (this.server) {
        const maskedMobile = (result as any).data.mobile?.slice(-4).padStart(12, '*') || '********0000';
        this.server.emit('new_bet', {
          id: result.data.betId,
          user: maskedMobile,
          amount: data.amount,
          floor: data.betType === 'SINGLE' ? `Floor ${data.numbers.join(', ')}` : `${data.betType} (F${data.numbers.join(',')})`,
          timestamp: new Date().toISOString()
        });
      }

      // 6. Confirm to sender
      client.emit('bet_confirmed', {
        amount: data.amount,
        balance: result.data.balanceAfter,
        betId: result.data.betId
      });

    } catch (error: any) {
      this.logger.error(`Bet Rejected: ${error.message}`);
      client.emit('bet_rejected', {
        message: error?.response?.error?.message || error.message || 'Bet placement failed'
      });
    }
  }
}
