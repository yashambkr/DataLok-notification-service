import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket exception filter for handling Socket.IO errors
 */
@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        const client = host.switchToWs().getClient<Socket>();
        const error = exception.getError();
        const details = typeof error === 'string' ? { message: error } : error;

        client.emit('error', details);
    }
}
