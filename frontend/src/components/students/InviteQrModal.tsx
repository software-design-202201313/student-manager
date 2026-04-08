import { getQrCodeImageUrl } from '../../utils/inviteShareText';

export default function InviteQrModal({ inviteUrl, onClose }: { inviteUrl: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">QR 보기</h3>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <img src={getQrCodeImageUrl(inviteUrl)} alt="초대 QR 코드" className="h-60 w-60 rounded border" />
          <div className="text-center text-sm text-gray-500">카메라로 스캔해 가입 링크를 열 수 있습니다.</div>
        </div>
      </div>
    </div>
  );
}
