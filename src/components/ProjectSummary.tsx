import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/judges";

export default function ProjectSummary({ project }: { project: Project }) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge>{project.track}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-foreground">{project.description}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground mb-1">Architecture</p>
          <p className="text-foreground">{project.architecture}</p>
        </div>
        {project.demo_transcript && (
          <div>
            <p className="font-medium text-muted-foreground mb-1">Demo Notes</p>
            <p className="text-foreground">{project.demo_transcript}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
