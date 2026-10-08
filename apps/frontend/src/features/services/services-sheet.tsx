import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Info, User, GitBranch, Phone, Tag, Box } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export type StaticMetadata = {
  serviceName: string;
  team: string;
  type: 'Web' | 'DB' | 'Cache' | 'Function' | 'Custom' | 'Browser' | 'Mobile';
  onCall: string;
  contact: string;
  repo: string;
  metadataSource: 'UI' | 'API' | 'Terraform';
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: { ServiceName: string }[];
  metadata: Record<string, StaticMetadata>;
  onSave: (metadata: Record<string, StaticMetadata>) => void;
};

export function ServiceMetadataSheet({ open, onOpenChange, services, metadata, onSave }: Props) {
  const [draft, setDraft] = useState<Record<string, StaticMetadata>>(metadata);
  const [selectedService, setSelectedService] = useState<string>('');

  // Sync draft when metadata changes externally (e.g., reset)
  useEffect(() => {
    if (open) setDraft(metadata);
  }, [open, metadata]);

  const handleChange = (serviceName: string, field: keyof StaticMetadata, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [serviceName]: {
        ...prev[serviceName],
        serviceName,
        [field]: value,
      } as StaticMetadata,
    }));
  };

  const handleAdd = () => {
    if (!selectedService || draft[selectedService]) return;
    setDraft((prev) => ({
      ...prev,
      [selectedService]: {
        serviceName: selectedService,
        team: '',
        type: 'Web',
        onCall: '',
        contact: '',
        repo: '',
        metadataSource: 'UI',
      },
    }));
    setSelectedService('');
  };

  const handleRemove = (serviceName: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const availableServices = services.filter((s) => !draft[s.ServiceName]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-purple-600" />
            Service Metadata Setup
          </SheetTitle>
          <SheetDescription>
            Define static ownership and repository metadata. This data appears in the Service Catalog table.
          </SheetDescription>
        </SheetHeader>

        {availableServices.length > 0 && (
          <div className="mb-6 flex items-end gap-2 rounded-lg border bg-slate-50 p-3">
            <div className="flex-1">
              <Label className="mb-1 block text-xs uppercase text-muted-foreground">Add Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a service to configure…" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((s) => (
                    <SelectItem key={s.ServiceName} value={s.ServiceName}>
                      {s.ServiceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!selectedService} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}

        {Object.keys(draft).length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No metadata configured yet. Add a service above to define its Team, Repo, and On-Call info.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {Object.values(draft).map((meta) => (
              <div key={meta.serviceName} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm bg-blue-100 flex items-center justify-center">
                      <Box className="h-3 w-3 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-sm">{meta.serviceName}</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(meta.serviceName)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Tag className="h-3 w-3" /> Type
                    </Label>
                    <Select value={meta.type} onValueChange={(v) => handleChange(meta.serviceName, 'type', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Web', 'DB', 'Cache', 'Function', 'Custom', 'Browser', 'Mobile'].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" /> Team
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. transactions"
                      value={meta.team}
                      onChange={(e) => handleChange(meta.serviceName, 'team', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> On-Call
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. @slack-alerts"
                      value={meta.onCall}
                      onChange={(e) => handleChange(meta.serviceName, 'onCall', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" /> Contact
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. #team-channel"
                      value={meta.contact}
                      onChange={(e) => handleChange(meta.serviceName, 'contact', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <GitBranch className="h-3 w-3" /> Repository
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. github.com/org/repo"
                      value={meta.repo}
                      onChange={(e) => handleChange(meta.serviceName, 'repo', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Info className="h-3 w-3" /> Metadata Source
                    </Label>
                    <Select value={meta.metadataSource} onValueChange={(v) => handleChange(meta.serviceName, 'metadataSource', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['UI', 'API', 'Terraform'].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background pt-4">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" /> Save Metadata
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}