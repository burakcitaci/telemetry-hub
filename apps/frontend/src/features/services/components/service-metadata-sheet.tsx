import { useEffect, useState } from 'react';
import {
  Save,
  Info,
  User,
  GitBranch,
  Phone,
  Tag,
  Box,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { EMPTY_METADATA, type ServiceMetadata } from '../types';
import { api, unwrap } from '@/shared/api/client';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  metadata: ServiceMetadata | null;
  onSave: (metadata: ServiceMetadata) => Promise<void>;
};

export function ServiceMetadataSheet({
  open,
  onOpenChange,
  serviceName,
  metadata,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setTeamsLoading(true);
    setTeamsError(undefined);
    api.get('/service-metadata/teams', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setTeams(unwrap(data)); })
      .catch(() => { if (!controller.signal.aborted) setTeamsError('Could not load organization teams. Close and reopen to retry.'); })
      .finally(() => { if (!controller.signal.aborted) setTeamsLoading(false); });
    return () => controller.abort();
  }, [open]);
  const [draft, setDraft] = useState<ServiceMetadata>(
    metadata ?? EMPTY_METADATA(serviceName),
  );

  useEffect(() => {
    if (open) { setDraft(metadata ?? EMPTY_METADATA(serviceName)); setSaveError(undefined); }
  }, [open, metadata, serviceName]);

  const update = <K extends keyof ServiceMetadata>(
    field: K,
    value: ServiceMetadata[K],
  ) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(undefined);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch {
      setSaveError('Could not save metadata. Check your connection and field lengths, then retry.');
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Service Metadata
          </SheetTitle>
          <SheetDescription>
            Configure ownership and repository metadata for{' '}
            <span className="font-medium text-foreground">{serviceName}</span>.
          </SheetDescription>
        </SheetHeader>

        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This metadata appears in the Service Catalog table and on this page.
          </AlertDescription>
        </Alert>

        {saveError && <p role="alert" className="mb-4 text-sm text-destructive">{saveError}</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Tag className="h-3 w-3" /> Type
            </Label>
            <Select
              value={draft.type}
              onValueChange={(v) =>
                update('type', v as ServiceMetadata['type'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'Web',
                  'DB',
                  'Cache',
                  'Function',
                  'Custom',
                  'Browser',
                  'Mobile',
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" /> Team
            </Label>
            <Select value={draft.team || '__unassigned__'} disabled={teamsLoading || !!teamsError || saving}
              onValueChange={value => update('team', value === '__unassigned__' ? '' : value)}>
              <SelectTrigger aria-label="Team"><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {draft.team && !teams.some(team => team.id === draft.team) &&
                  <SelectItem value={draft.team} disabled>Unavailable team: {draft.team}</SelectItem>}
                {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {teamsLoading && <p role="status" className="text-xs text-muted-foreground">Loading teams…</p>}
            {teamsError && <p role="alert" className="text-xs text-destructive">{teamsError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" /> On-Call
              </Label>
              <Input
                placeholder="@slack-alerts"
                value={draft.onCall}
                onChange={(e) => update('onCall', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" /> Contact
              </Label>
              <Input
                placeholder="#team-channel"
                value={draft.contact}
                onChange={(e) => update('contact', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <GitBranch className="h-3 w-3" /> Repository
            </Label>
            <Input
              placeholder="github.com/org/repo"
              value={draft.repo}
              onChange={(e) => update('repo', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <Info className="h-3 w-3" /> Metadata Source
            </Label>
            <Select
              value={draft.metadataSource}
              onValueChange={(v) =>
                update('metadataSource', v as ServiceMetadata['metadataSource'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['UI', 'API', 'Terraform'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background pt-4">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button disabled={saving || teamsLoading || !!teamsError} onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
