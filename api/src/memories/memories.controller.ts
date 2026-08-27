import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { CaptureMemoryDto } from './dto/capture-memory.dto';
import { FindMemoriesQueryDto } from './dto/find-memories-query.dto';

@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  create(@Body() createMemoryDto: CreateMemoryDto) {
    return this.memoriesService.create(createMemoryDto);
  }

  @Post('capture')
  async capture(@Body() dto: CaptureMemoryDto) {
    const result = await this.memoriesService.capture(dto.input);
    if (result.status === 'captured') {
      return result.memory;
    }
    throw new UnprocessableEntityException({
      status: result.status,
      reason: result.reason ?? null,
    });
  }

  @Get()
  findAll(@Query() query: FindMemoriesQueryDto) {
    return this.memoriesService.findAll(
      query.type ? { type: query.type } : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memoriesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMemoryDto: UpdateMemoryDto) {
    return this.memoriesService.update(id, updateMemoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.memoriesService.delete(id);
  }
}
