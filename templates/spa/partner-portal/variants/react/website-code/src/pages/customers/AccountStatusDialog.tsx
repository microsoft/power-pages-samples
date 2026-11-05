import { ConfirmDialog } from '../../components/Modal'

export function AccountStatusDialog({ accountName, onConfirm, onClose }: { accountName: string | null; onConfirm: () => unknown; onClose: () => void }) {
  return (
    <ConfirmDialog
      open={accountName !== null}
      title="Deactivate account?"
      message={
        <>
          <p className="m-0">
            <strong>{accountName}</strong> will be hidden from new opportunities. Its contacts and existing opportunities are kept.
          </p>
          <p className="mt-2 mb-0">You can reactivate it any time.</p>
        </>
      }
      confirmLabel="Deactivate account"
      cancelLabel="Keep active"
      tone="danger"
      pendingLabel="Deactivating…"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
