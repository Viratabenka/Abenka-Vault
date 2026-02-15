import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectTeamController } from './project-team.controller';

@Module({
  controllers: [ProjectsController, ProjectTeamController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
