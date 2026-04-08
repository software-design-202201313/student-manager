export function buildStudentInviteShareText(input: {
  studentName: string;
  classLabel?: string;
  studentNumber?: number;
  inviteUrl: string;
}) {
  const prefix = [
    `${input.studentName} 학생 계정 초대 링크입니다.`,
    input.classLabel ? `학급: ${input.classLabel}` : null,
    input.studentNumber != null ? `번호: ${input.studentNumber}` : null,
    '아래 링크에서 비밀번호를 설정하고 가입을 완료해 주세요.',
    input.inviteUrl,
  ].filter(Boolean);

  return prefix.join('\n');
}

export function getQrCodeImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}`;
}
