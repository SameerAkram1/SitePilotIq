'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, Pencil } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  levelType: string;
  sortOrder: number;
  parentId?: string | null;
  children: TreeNode[];
}

interface TreeViewProps {
  data: TreeNode[];
  onAdd?: (parentId: string | null) => void;
  onEdit?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

function TreeItem({
  node,
  level,
  onAdd,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  node: TreeNode;
  level: number;
  onAdd?: (parentId: string | null) => void;
  onEdit?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const levelColors: Record<string, string> = {
    BUILDING: 'text-blue-600',
    FLOOR: 'text-emerald-600',
    ZONE: 'text-amber-600',
    ELEMENT: 'text-violet-600',
    ROOM: 'text-pink-600',
    WING: 'text-cyan-600',
    LEVEL: 'text-orange-600',
    AREA: 'text-teal-600',
  };

  const colorClass = levelColors[node.levelType] || 'text-gray-600';

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted group"
        style={{ paddingLeft: `${level * 24}px` }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-4 w-4 flex items-center justify-center text-muted-foreground"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="h-3 w-3" />
          )}
        </button>

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className={`h-4 w-4 ${colorClass}`} />
          ) : (
            <Folder className={`h-4 w-4 ${colorClass}`} />
          )
        ) : (
          <div className={`h-4 w-4 flex items-center justify-center text-xs font-bold ${colorClass}`}>
            {node.levelType.charAt(0)}
          </div>
        )}

        <span className="text-sm font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
          {node.levelType}
        </span>

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAdd?.(node.id)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground"
            title="Add child"
          >
            <span className="text-xs">+</span>
          </button>
          {canEdit && (
            <button
              onClick={() => onEdit?.(node)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete?.(node)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            level={level + 1}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
    </div>
  );
}

export function TreeView({
  data,
  onAdd,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: TreeViewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No locations defined yet</p>
        <p className="text-xs mt-1">Click "Add Location" to create the first one</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
