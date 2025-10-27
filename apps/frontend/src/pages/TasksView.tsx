import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button as ButtonDropdown } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  Plus,
  Filter,
  Download,
  Columns3,
  MoreHorizontal,
  ArrowUpDown,
  Calendar,
  Search
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  type: 'feature' | 'bug' | 'enhancement' | 'documentation';
  status: 'done' | 'todo' | 'cancelled' | 'in-progress';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  description?: string;
}

const mockTasks: Task[] = [
  {
    id: 'TASK-3212',
    title: 'If we hack the bus, we can get to the SDD application through the redundant...',
    type: 'feature',
    status: 'done',
    priority: 'low',
    createdAt: '2025-10-25',
    description: 'Implement redundant bus communication for SDD application'
  },
  {
    id: 'TASK-6679',
    title: 'You can\'t navigate the bandwidth without indexing the back-end XML driver...',
    type: 'bug',
    status: 'todo',
    priority: 'medium',
    createdAt: '2025-10-25',
    description: 'Fix XML driver navigation issues'
  },
  {
    id: 'TASK-2206',
    title: 'You can\'t generate the pixel without overriding the back-end TLS microchip!',
    type: 'bug',
    status: 'done',
    priority: 'medium',
    createdAt: '2025-10-25',
    description: 'Override TLS microchip for pixel generation'
  },
  {
    id: 'TASK-6431',
    title: 'You can\'t index the transmitter without copying the multi-byte SCSI interface...',
    type: 'bug',
    status: 'cancelled',
    priority: 'medium',
    createdAt: '2025-10-25',
    description: 'Copy multi-byte SCSI interface for transmitter'
  },
  {
    id: 'TASK-8419',
    title: 'We need to synthesize the virtual HEX alarm!',
    type: 'enhancement',
    status: 'todo',
    priority: 'low',
    createdAt: '2025-10-25',
    description: 'Synthesize virtual HEX alarm system'
  },
  {
    id: 'TASK-9732',
    title: 'We need to compress the digital AGP system!',
    type: 'bug',
    status: 'cancelled',
    priority: 'low',
    createdAt: '2025-10-25',
    description: 'Compress digital AGP system'
  },
  {
    id: 'TASK-4271',
    title: 'I\'ll copy the virtual CSS bus, that should matrix the IB protocol!',
    type: 'feature',
    status: 'done',
    priority: 'high',
    createdAt: '2025-10-25',
    description: 'Copy virtual CSS bus for IB protocol matrix'
  },
  {
    id: 'TASK-3495',
    title: 'Try to copy the PNG feed, maybe it will compress the bluetooth transmitter!',
    type: 'documentation',
    status: 'done',
    priority: 'high',
    createdAt: '2025-10-25',
    description: 'Document PNG feed compression for bluetooth transmitter'
  },
  {
    id: 'TASK-9321',
    title: 'I\'ll connect the wireless ASCII bandwidth, that should card the ASCII array!',
    type: 'bug',
    status: 'in-progress',
    priority: 'high',
    createdAt: '2025-10-25',
    description: 'Connect wireless ASCII bandwidth for array carding'
  },
  {
    id: 'TASK-0196',
    title: 'Connecting the panel won\'t do anything, we need to compress the auxiliary...',
    type: 'enhancement',
    status: 'todo',
    priority: 'high',
    createdAt: '2025-10-25',
    description: 'Compress auxiliary panel connections'
  }
];

function TasksView() {
  const [tasks] = useState<Task[]>(mockTasks);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'todo':
        return <Circle className="h-4 w-4 text-gray-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      done: 'bg-green-100 text-green-800 hover:bg-green-100/80',
      todo: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80',
      cancelled: 'bg-red-100 text-red-800 hover:bg-red-100/80',
      'in-progress': 'bg-blue-100 text-blue-800 hover:bg-blue-100/80'
    };

    const labels = {
      done: 'Done',
      todo: 'Todo',
      cancelled: 'Cancelled',
      'in-progress': 'In-Progress'
    };

    return (
      <Badge variant="secondary" className={`${variants[status]} border-0 text-xs font-medium`}>
        {labels[status]}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return <ArrowUpDown className="h-3 w-3 text-red-600 rotate-180" />;
      case 'medium':
        return <ArrowUpDown className="h-3 w-3 text-yellow-600" />;
      case 'low':
        return <ArrowUpDown className="h-3 w-3 text-green-600" />;
      default:
        return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      high: 'bg-red-100 text-red-800 hover:bg-red-100/80',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80',
      low: 'bg-green-100 text-green-800 hover:bg-green-100/80'
    };

    const labels = {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };

    return (
      <div className="flex items-center gap-1">
        {getPriorityIcon(priority)}
        <Badge variant="secondary" className={`${variants[priority]} border-0 text-xs font-medium`}>
          {labels[priority]}
        </Badge>
      </div>
    );
  };

  const getTypeBadge = (type: Task['type']) => {
    const variants = {
      feature: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
      bug: 'bg-red-100 text-red-800 hover:bg-red-100/80',
      enhancement: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
      documentation: 'bg-green-100 text-green-800 hover:bg-green-100/80'
    };

    const labels = {
      feature: 'feature',
      bug: 'bug',
      enhancement: 'enhancement',
      documentation: 'documentation'
    };

    return (
      <Badge variant="secondary" className={`${variants[type]} border-0 text-xs font-medium`}>
        {labels[type]}
      </Badge>
    );
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesType = typeFilter === 'all' || task.type === typeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, typeFilter, sortBy, sortOrder]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(filteredAndSortedTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const allSelected = filteredAndSortedTasks.length > 0 && selectedTasks.length === filteredAndSortedTasks.length;
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < filteredAndSortedTasks.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Pick a date
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tasks</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in-progress">In-Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New task
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Columns3 className="h-4 w-4 mr-2" />
            Columns
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(checked)}
                  aria-label="Select all tasks"
                />
              </TableHead>
              <TableHead className="min-w-64">Title</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Priority</TableHead>
              <TableHead className="w-32">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={(checked) => handleSelectTask(task.id, checked)}
                    aria-label={`Select task ${task.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{task.id}</span>
                      {getTypeBadge(task.type)}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {task.title}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    {getStatusBadge(task.status)}
                  </div>
                </TableCell>
                <TableCell>
                  {getPriorityBadge(task.priority)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  October 25, 2025
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50/50 h-10">
          <div className="text-sm text-muted-foreground">
            {selectedTasks.length > 0 ? `${selectedTasks.length} of ${filteredAndSortedTasks.length} row(s) selected.` : `${filteredAndSortedTasks.length} of ${tasks.length} row(s) selected.`}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select defaultValue="10">
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">No tasks found matching your criteria.</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksView;
