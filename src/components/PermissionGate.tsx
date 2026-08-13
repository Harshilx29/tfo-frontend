import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { useTempAccess } from '../context/TempAccessContext';

interface Props {
  permissionKey: string | string[];
  children: React.ReactElement;
  /** Tooltip text shown on hover when disabled. Defaults to standard message. */
  tip?: string;
}

/**
 * PermissionGate — wraps any button/action that requires a permission.
 *
 * - If the user has the permission (or is admin): renders children unchanged.
 * - If not: clones the child with `disabled=true`, wraps in a span that shows
 *   a tooltip on hover. The button is visually disabled but still rendered.
 * - In read-only temp-link sessions: everything is always disabled.
 */
export function PermissionGate({
  permissionKey,
  children,
  tip = "You don't have permission for this",
}: Props) {
  const hasPermission = usePermission(permissionKey);
  const { isReadOnly } = useTempAccess();

  const allowed = hasPermission && !isReadOnly;

  if (allowed) return children;

  const tooltip = isReadOnly
    ? 'Read-only access — modifications are not allowed'
    : tip;

  return (
    <span
      className="perm-gate"
      data-disabled="true"
      data-tip={tooltip}
      style={{ display: 'inline-block', cursor: 'not-allowed' }}
    >
      {React.cloneElement(children, {
        disabled: true,
        'aria-disabled': true,
        style: { ...(children.props.style ?? {}), pointerEvents: 'none' },
      })}
    </span>
  );
}
