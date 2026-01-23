// 이메일 템플릿

const baseStyles = `
  body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
  .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; }
  .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
  .info-row { display: flex; margin: 8px 0; }
  .info-label { font-weight: 600; width: 100px; color: #6b7280; }
  .info-value { flex: 1; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .status-confirmed { background: #dcfce7; color: #166534; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-cancelled { background: #fee2e2; color: #991b1b; }
`

interface BookingInfo {
  applicantName: string
  facilityName: string
  rentalDate: string
  timeSlots?: string
  organization?: string
  status?: string
}

// 새 예약 알림 이메일
export function newBookingEmail(booking: BookingInfo, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📅 새 예약 알림</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">종로 스튜디오 FMS</p>
    </div>
    <div class="content">
      <p>새로운 예약이 등록되었습니다.</p>

      <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div class="info-row">
          <span class="info-label">신청자</span>
          <span class="info-value">${booking.applicantName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">스튜디오</span>
          <span class="info-value">${booking.facilityName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">대관일</span>
          <span class="info-value">${booking.rentalDate}</span>
        </div>
        ${booking.timeSlots ? `
        <div class="info-row">
          <span class="info-label">시간</span>
          <span class="info-value">${booking.timeSlots}</span>
        </div>
        ` : ''}
        ${booking.organization ? `
        <div class="info-row">
          <span class="info-label">단체명</span>
          <span class="info-value">${booking.organization}</span>
        </div>
        ` : ''}
      </div>

      <a href="${dashboardUrl}/bookings" class="button">예약 관리 바로가기</a>
    </div>
    <div class="footer">
      <p>이 메일은 종로 스튜디오 FMS에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
`
}

// 상태 변경 알림 이메일
export function statusChangeEmail(
  booking: BookingInfo,
  oldStatus: string,
  newStatus: string,
  dashboardUrl: string
): string {
  const statusLabels: Record<string, string> = {
    CONFIRMED: '승인됨',
    CANCELLED: '취소됨',
    TENTATIVE: '대기중',
    PENDING: '접수됨',
    DONE: '완료',
    IN_USE: '이용중',
  }

  const statusClass: Record<string, string> = {
    CONFIRMED: 'status-confirmed',
    CANCELLED: 'status-cancelled',
    PENDING: 'status-pending',
    TENTATIVE: 'status-pending',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🔄 예약 상태 변경</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">종로 스튜디오 FMS</p>
    </div>
    <div class="content">
      <p>예약 상태가 변경되었습니다.</p>

      <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div class="info-row">
          <span class="info-label">신청자</span>
          <span class="info-value">${booking.applicantName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">스튜디오</span>
          <span class="info-value">${booking.facilityName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">대관일</span>
          <span class="info-value">${booking.rentalDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">상태 변경</span>
          <span class="info-value">
            <span class="status-badge ${statusClass[oldStatus] || ''}">${statusLabels[oldStatus] || oldStatus}</span>
            →
            <span class="status-badge ${statusClass[newStatus] || ''}">${statusLabels[newStatus] || newStatus}</span>
          </span>
        </div>
      </div>

      <a href="${dashboardUrl}/bookings" class="button">예약 관리 바로가기</a>
    </div>
    <div class="footer">
      <p>이 메일은 종로 스튜디오 FMS에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
`
}

// 일일 리포트 이메일
export function dailyReportEmail(
  date: string,
  stats: {
    totalBookings: number
    confirmedBookings: number
    pendingBookings: number
    totalRevenue: number
    studioUsage: { name: string; hours: number; percentage: number }[]
  },
  dashboardUrl: string
): string {
  const studioRows = stats.studioUsage
    .map(
      (s) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${s.hours}시간</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${s.percentage}%</td>
      </tr>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📊 일일 리포트</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${date} - 종로 스튜디오 FMS</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-bottom: 16px;">예약 현황</h2>
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: white; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${stats.totalBookings}</div>
          <div style="font-size: 12px; color: #6b7280;">전체 예약</div>
        </div>
        <div style="flex: 1; background: white; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${stats.confirmedBookings}</div>
          <div style="font-size: 12px; color: #6b7280;">확정 예약</div>
        </div>
        <div style="flex: 1; background: white; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${stats.pendingBookings}</div>
          <div style="font-size: 12px; color: #6b7280;">대기 예약</div>
        </div>
      </div>

      <h2 style="font-size: 18px; margin-bottom: 16px;">매출</h2>
      <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">₩${stats.totalRevenue.toLocaleString()}</div>
        <div style="font-size: 12px; color: #6b7280;">일일 매출</div>
      </div>

      <h2 style="font-size: 18px; margin-bottom: 16px;">스튜디오별 이용률</h2>
      <table style="width: 100%; background: white; border-radius: 8px; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">스튜디오</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">이용시간</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">이용률</th>
          </tr>
        </thead>
        <tbody>
          ${studioRows}
        </tbody>
      </table>

      <a href="${dashboardUrl}/statistics" class="button">상세 통계 보기</a>
    </div>
    <div class="footer">
      <p>이 메일은 종로 스튜디오 FMS에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
`
}
