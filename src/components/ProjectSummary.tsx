import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Presentation, FileVideo } from "lucide-react";
import type { Project } from "@/lib/judges";

export default function ProjectSummary({ project }: { project: Project }) {
  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-logo text-sm tracking-wider">{project.name.toUpperCase()}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{project.track}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-muted-foreground mb-1 text-xs uppercase tracking-wider">Description</p>
          <p className="text-foreground text-xs">{project.description}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground mb-1 text-xs uppercase tracking-wider">Architecture</p>
          <p className="text-foreground text-xs">{project.architecture}</p>
        </div>
        {project.demo_transcript && (
          <div>
            <p className="font-medium text-muted-foreground mb-1 text-xs uppercase tracking-wider">Demo Notes</p>
            <p className="text-foreground text-xs">{project.demo_transcript}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {project.website_url && (
            <a href={project.website_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-secondary">
                <Globe className="h-3 w-3 mr-1" /> Website
              </Badge>
            </a>
          )}
          {project.presentation_url && (
            <a href={project.presentation_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-secondary">
                <Presentation className="h-3 w-3 mr-1" /> Slides
              </Badge>
            </a>
          )}
          {project.video_url && (
            <a href={project.video_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-secondary">
                <FileVideo className="h-3 w-3 mr-1" /> Video
              </Badge>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
