import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns a plain-text status string. Used by the frontend to verify the backend is reachable.' })
  @ApiResponse({ status: 200, description: 'Server is online.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
