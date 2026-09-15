/**
 * 공강메이트 (GonggangMate) - Main JavaScript
 * 버전: v0.1
 * 기능:
 *  - 1. 상단 메뉴 탭 전환 (나의 시간표, 공강 활용, 친구 추가) 및 모바일 네비게이션
 *  - 2. 시간표 렌더링 & 공강 시간 자동 계산 알고리즘 (PRD F1)
 *  - 3. 위치 기반 이동시간 추정 및 출발 알림 (PRD F3)
 *  - 4. 공강 길이별 규칙 기반 활동 추천 엔진 (PRD F2)
 *  - 5. 친구 등록 및 공강 교집합 밥메이트 분석 (PRD F4)
 *  - 6. 로컬 스토리지 데이터 영속화
 */

// ==========================================================================
// 1. 상수 및 초기 데이터셋 (PRD 페르소나 김도현 기준)
// ==========================================================================
const DAYS = [
  { key: 'mon', label: '월요일', short: '월' },
  { key: 'tue', label: '화요일', short: '화' },
  { key: 'wed', label: '수요일', short: '수' },
  { key: 'thu', label: '목요일', short: '목' },
  { key: 'fri', label: '금요일', short: '금' }
];

const START_HOUR = 9;   // 09:00 = 540분
const END_HOUR = 18;    // 18:00 = 1080분
const START_MIN_DAY = START_HOUR * 60;
const PIXELS_PER_MINUTE = 1; // 1분당 1px (1시간 = 60px)

// PRD 페르소나 김도현 테스트용 샘플 시간표 (사용자가 '샘플 불러오기'를 명시적으로 클릭할 때만 사용)
const SAMPLE_COURSES = [
  { id: 'c1', title: '경영학원론', day: 'mon', startMin: 540, endMin: 630, building: '인문관 305호', color: 'rgb(79, 70, 229)' }, // 09:00 ~ 10:30
  { id: 'c2', title: '경제학개론', day: 'mon', startMin: 810, endMin: 900, building: '경영관 201호', color: 'rgb(37, 99, 235)' },   // 13:30 ~ 15:00
  { id: 'c3', title: '대학영어', day: 'tue', startMin: 660, endMin: 750, building: '어학원 101호', color: 'rgb(16, 185, 129)' }, // 11:00 ~ 12:30
  { id: 'c4', title: '컴퓨터프로그래밍', day: 'tue', startMin: 900, endMin: 1020, building: 'IT관 402호', color: 'rgb(139, 92, 246)' }, // 15:00 ~ 17:00
  { id: 'c5', title: '경영학원론', day: 'wed', startMin: 540, endMin: 630, building: '인문관 305호', color: 'rgb(79, 70, 229)' }, // 09:00 ~ 10:30
  { id: 'c6', title: '회계원리', day: 'wed', startMin: 840, endMin: 960, building: '경영관 105호', color: 'rgb(245, 158, 11)' },   // 14:00 ~ 16:00
  { id: 'c7', title: '대학영어', day: 'thu', startMin: 660, endMin: 750, building: '어학원 101호', color: 'rgb(16, 185, 129)' }, // 11:00 ~ 12:30
  { id: 'c8', title: '비즈니스통계', day: 'thu', startMin: 810, endMin: 900, building: '경영관 203호', color: 'rgb(37, 99, 235)' },   // 13:30 ~ 15:00
  { id: 'c9', title: '글로벌경영특강', day: 'fri', startMin: 600, endMin: 720, building: '인문관 102호', color: 'rgb(139, 92, 246)' } // 10:00 ~ 12:00
];

// 건물 간 이동 시간 맵(분 단위)
const WALKING_TIMES = {
  '중앙도서관': { 'IT관 402호': 7, '경영관 201호': 5, '인문관 305호': 6, '어학원 101호': 4, '기본': 6 },
  '학생회관': { 'IT관 402호': 10, '경영관 201호': 3, '인문관 305호': 8, '어학원 101호': 5, '기본': 5 },
  '인문관': { 'IT관 402호': 12, '경영관 201호': 9, '인문관 305호': 1, '어학원 101호': 7, '기본': 8 },
  '경영관': { 'IT관 402호': 8, '경영관 201호': 1, '인문관 305호': 9, '어학원 101호': 4, '기본': 5 },
  '정문카페거리': { 'IT관 402호': 14, '경영관 201호': 10, '인문관 305호': 12, '어학원 101호': 8, '기본': 10 },
  '기숙사': { 'IT관 402호': 15, '경영관 201호': 12, '인문관 305호': 14, '어학원 101호': 11, '기본': 12 }
};

// PRD F2 공강 추천 활동 목록
const RECOMMENDED_ACTIVITIES = [
  // 15~30분: 짧은 휴식 & 정리
  {
    id: 'act-1',
    durationCategory: 'short',
    durationLabel: '15~30분',
    title: '학관 카페 커피 & 멍때리기',
    desc: '수업 후 달콤한 아메리카노 한 잔과 함께 뇌에 잠시 휴식을 줍니다.',
    place: '학생회관 1층 카페',
    badge: '짧은 휴식'
  },
  {
    id: 'act-2',
    durationCategory: 'short',
    durationLabel: '15~30분',
    title: '오늘 배운 핵심 내용 5분 훑어보기',
    desc: '강의 직후 바로 훑어보면 망각 곡선을 방어할 수 있습니다.',
    place: '현재 강의실 / 빈 벤치',
    badge: '스마트 복습'
  },
  {
    id: 'act-3',
    durationCategory: 'short',
    durationLabel: '15~30분',
    title: '이번 주 과제 To-do 플래너 정리',
    desc: '휴대폰으로 흩어진 공지사항과 마감 기한을 한 번에 정돈합니다.',
    place: '교내 어디서나',
    badge: '갓생 정리'
  },

  // 30~60분: 가벼운 실행 & 식사
  {
    id: 'act-4',
    durationCategory: 'medium',
    durationLabel: '30~60분',
    title: '학생식당에서 여유로운 점심 식사',
    desc: '줄이 덜 붐비는 시간대에 든든하게 학식 한 끼를 해결하세요.',
    place: '학생식당 / 교직원식당',
    badge: '식사/충전'
  },
  {
    id: 'act-5',
    durationCategory: 'medium',
    durationLabel: '30~60분',
    title: '중앙도서관 희망 도서 대출 및 둘러보기',
    desc: '도서관 신간 서가에서 읽고 싶었던 책을 빌려 가볍게 읽어봅니다.',
    place: '중앙도서관 2층 종합자료실',
    badge: '문화/탐독'
  },
  {
    id: 'act-6',
    durationCategory: 'medium',
    durationLabel: '30~60분',
    title: '토익/어학 단어 퀴즈 1세트 클리어',
    desc: '자투리 40분을 활용해 퀴즈렛이나 단어장 50개를 정복하세요.',
    place: '도서관 로비 휴게존',
    badge: '자기계발'
  },

  // 60~120분: 집중 1세트
  {
    id: 'act-7',
    durationCategory: 'focus',
    durationLabel: '60~120분',
    title: '도서관 노트북존에서 리포트 1개 완성',
    desc: '방해받지 않는 90분 몰입으로 밀린 과제 하나를 끝내버립니다.',
    place: '중앙도서관 3층 디지털존',
    badge: '집중 몰입'
  },
  {
    id: 'act-8',
    durationCategory: 'focus',
    durationLabel: '60~120분',
    title: '교내 체육관/헬스장 1회 루틴 운동',
    desc: '체력 증진과 스트레스 해소를 위한 상체/하체 50분 운동!',
    place: '스포츠센터 헬스장',
    badge: '체력 충전'
  },
  {
    id: 'act-9',
    durationCategory: 'focus',
    durationLabel: '60~120분',
    title: '학관 스터디룸 예약 및 팀플 자료조사',
    desc: '친구와 조용히 모여 발표 PPT 템플릿과 참고 문헌을 조사합니다.',
    place: '학생회관 스터디룸',
    badge: '팀플 협업'
  },

  // 120분 이상: 딥워크 & 사회활동
  {
    id: 'act-10',
    durationCategory: 'deep',
    durationLabel: '120분 이상',
    title: '정문 외부 감성 카페 원정 & 딥워크',
    desc: '캠퍼스를 벗어나 분위기 좋은 카페에서 맛있는 디저트와 함께 작업합니다.',
    place: '정문 카페거리',
    badge: '힐링 딥워크'
  },
  {
    id: 'act-11',
    durationCategory: 'deep',
    durationLabel: '120분 이상',
    title: '동아리방 방문 & 선배·동기와 담소',
    desc: '동아리방 소파에서 편히 쉬며 선배들에게 꿀팁과 족보를 물어보세요.',
    place: '학생회관 4층 동아리방',
    badge: '캠퍼스 소셜'
  },
  {
    id: 'act-12',
    durationCategory: 'deep',
    durationLabel: '120분 이상',
    title: '캠퍼스 잔디밭 광합성 낮잠 & 팟캐스트',
    desc: '날씨 좋은 날 돗자리를 펴고 누워 꿀잠을 자며 에너지를 리셋하세요.',
    place: '중앙 잔디광장',
    badge: '꿀휴식'
  }
];

// 초기 친구 데이터
const INITIAL_FRIENDS = [
  {
    id: 'f1',
    name: '이지은 (민지)',
    code: 'MINJI-104',
    dept: '경영학부 1학년',
    status: '공강 중',
    freeSlotText: '12:30 ~ 15:00 공강 (화)',
    overlapToday: '12:30 ~ 13:45 (75분 겹침)',
    avatar: '민'
  },
  {
    id: 'f2',
    name: '김수현',
    code: 'SUHYUN-82',
    dept: '경제학과 1학년',
    status: '공강 중',
    freeSlotText: '12:00 ~ 14:00 공강 (화)',
    overlapToday: '12:30 ~ 13:45 (75분 겹침)',
    avatar: '수'
  },
  {
    id: 'f3',
    name: '박준호',
    code: 'JUNHO-77',
    dept: '컴퓨터공학과 1학년',
    status: '수업 중',
    freeSlotText: '16:00 ~ 18:00 공강 (화)',
    overlapToday: '화요일 겹침 없음',
    avatar: '준'
  }
];

// ==========================================================================
// 2. 전역 상태 (Application State)
// ==========================================================================
const state = {
  courses: [],
  friends: [],
  currentDay: 'tue', // 시뮬레이션 기본 요일 (화요일)
  selectedViewDay: 'all', // 모바일 요일 필터 ('all' | 'mon' | 'tue' | ...)
  currentLocation: '중앙도서관',
  activeDurationFilter: 'all',
  completedMissions: [],
  lunchCallSent: false
};

// ==========================================================================
// 3. 헬퍼 유틸리티 함수
// ==========================================================================
// 분 단위를 "09:30" 형식으로 변환
function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm}`;
}

// "09:30" 문자열을 분 정수로 변환
function parseTimeToMinutes(timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
}

// 분 길이를 "2시간 30분" 형식으로 변환
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// 토스트 메시지 출력
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>💬</span><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==========================================================================
// 4. 로컬 스토리지 동기화
// ==========================================================================
function saveStateToStorage() {
  try {
    localStorage.setItem('gonggang_courses', JSON.stringify(state.courses));
    localStorage.setItem('gonggang_friends', JSON.stringify(state.friends));
    localStorage.setItem('gonggang_missions', JSON.stringify(state.completedMissions));
  } catch (e) {
    console.warn('LocalStorage 저장 실패:', e);
  }
}

const CURRENT_APP_VERSION = 'v0.3_empty_clean';

function loadStateFromStorage() {
  try {
    // 브라우저에 남아있을 수 있는 구버전 샘플 시간표 데이터를 강제 1회 초기화 (빈 시간표 보장)
    if (localStorage.getItem('gonggang_schema_version') !== CURRENT_APP_VERSION) {
      localStorage.removeItem('gonggang_courses');
      localStorage.setItem('gonggang_schema_version', CURRENT_APP_VERSION);
    }

    const savedCourses = localStorage.getItem('gonggang_courses');
    const savedFriends = localStorage.getItem('gonggang_friends');
    const savedMissions = localStorage.getItem('gonggang_missions');

    // 사용자의 명확한 요구: "애초에 내 시간표가 채워져있으면 안된다"
    // 사용자가 직접 등록하기 전에는 무조건 빈 배열 []로 시작
    state.courses = savedCourses ? JSON.parse(savedCourses) : [];
    state.friends = savedFriends ? JSON.parse(savedFriends) : [...INITIAL_FRIENDS];
    state.completedMissions = savedMissions ? JSON.parse(savedMissions) : [];
  } catch (e) {
    state.courses = [];
    state.friends = [...INITIAL_FRIENDS];
    state.completedMissions = [];
  }
}

// ==========================================================================
// 5. 핵심 알고리즘: 공강 자동 계산 (PRD F1)
// ==========================================================================
/**
 * 요일별 수업 리스트를 기반으로 수업 간 30분 이상의 공강(FreeSlot)을 계산합니다.
 */
function calculateFreeSlots(courses) {
  const freeSlotsByDay = {};
  let totalFreeMinutes = 0;
  let allSlots = [];

  DAYS.forEach(day => {
    // 1. 해당 요일 수업을 시작 시간순으로 정렬
    const dayCourses = courses
      .filter(c => c.day === day.key)
      .sort((a, b) => a.startMin - b.startMin);

    const daySlots = [];

    // 2. 인접한 두 수업 간의 간격(gap) 계산
    for (let i = 0; i < dayCourses.length - 1; i++) {
      const prevCourse = dayCourses[i];
      const nextCourse = dayCourses[i + 1];

      const gap = nextCourse.startMin - prevCourse.endMin;

      // PRD 기준: 30분 이상인 경우 공강 슬롯 생성
      if (gap >= 30) {
        // 점심 시간대(11:30~13:30, 690분~810분)와 겹치는지 체크
        const lunchStart = 690;
        const lunchEnd = 810;
        const isLunch = Math.max(prevCourse.endMin, lunchStart) < Math.min(nextCourse.startMin, lunchEnd);

        const slot = {
          dayKey: day.key,
          dayLabel: day.label,
          startMin: prevCourse.endMin,
          endMin: nextCourse.startMin,
          duration: gap,
          prevCourse: prevCourse.title,
          nextCourse: nextCourse.title,
          nextBuilding: nextCourse.building,
          isLunch: isLunch
        };

        daySlots.push(slot);
        allSlots.push(slot);
        totalFreeMinutes += gap;
      }
    }

    freeSlotsByDay[day.key] = daySlots;
  });

  return { freeSlotsByDay, allSlots, totalFreeMinutes };
}

// ==========================================================================
// 6. 뷰 렌더링: 나의 시간표 (Timetable)
// ==========================================================================
function renderTimetable() {
  const grid = document.getElementById('timetable-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const { freeSlotsByDay, allSlots, totalFreeMinutes } = calculateFreeSlots(state.courses);

  // 빈 상태 안내 배너 및 배지 제어
  const emptyBanner = document.getElementById('timetable-empty-banner');
  const freeBadge = document.getElementById('free-count-badge');
  const quickMsg = document.getElementById('quick-status-msg');

  if (state.courses.length === 0) {
    if (emptyBanner) emptyBanner.style.display = 'flex';
    if (freeBadge) freeBadge.textContent = '0건';
    if (quickMsg) {
      quickMsg.innerHTML = '📅 <strong>나의 시간표:</strong> 등록된 강의가 없습니다. [강의 추가하기]를 눌러 첫 수업을 등록해보세요!';
    }
  } else {
    if (emptyBanner) emptyBanner.style.display = 'none';
    if (freeBadge) freeBadge.textContent = `${allSlots.length}건`;
    if (quickMsg) {
      quickMsg.innerHTML = allSlots.length > 0 
        ? `🎉 <strong>이번 주 공강:</strong> 총 ${allSlots.length}개 구간 (${formatDuration(totalFreeMinutes)})`
        : `📅 등록된 강의가 있습니다. 연강 사이 공강이 발견되면 자동으로 안내됩니다.`;
    }
  }

  // 1. 통계 바 갱신
  const statTotalFree = document.getElementById('stat-total-free');
  const statSlotCount = document.getElementById('stat-slot-count');
  const statMaxSlot = document.getElementById('stat-max-slot');

  if (statTotalFree) statTotalFree.textContent = totalFreeMinutes > 0 ? formatDuration(totalFreeMinutes) : '0시간';
  if (statSlotCount) statSlotCount.textContent = `${allSlots.length}개`;

  if (statMaxSlot) {
    if (allSlots.length > 0) {
      const maxSlot = allSlots.reduce((prev, current) => (prev.duration > current.duration) ? prev : current);
      statMaxSlot.textContent = `${maxSlot.dayLabel} (${formatDuration(maxSlot.duration)})`;
    } else {
      statMaxSlot.textContent = '-';
    }
  }

  // 2. 상단 헤더 셀 생성 (시간 + 월화수목금)
  const visibleDays = state.selectedViewDay === 'all' 
    ? DAYS 
    : DAYS.filter(d => d.key === state.selectedViewDay);

  // 모바일 단일 요일 모드 클래스 제어
  if (state.selectedViewDay === 'all') {
    grid.classList.remove('single-day');
    grid.style.gridTemplateColumns = `60px repeat(${visibleDays.length}, 1fr)`;
  } else {
    grid.classList.add('single-day');
    grid.style.gridTemplateColumns = `50px 1fr`;
  }

  // 좌상단 Time 셀
  const cornerHeader = document.createElement('div');
  cornerHeader.className = 'tt-header-cell time-col-header';
  cornerHeader.textContent = '시간';
  grid.appendChild(cornerHeader);

  // 요일 헤더 셀들
  visibleDays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'tt-header-cell';
    dayHeader.textContent = `${day.label} (${day.short})`;
    grid.appendChild(dayHeader);
  });

  // 3. 시간표 본문 생성
  // 시간 축 라벨 (09:00 ~ 17:00)
  const timeLabelsCol = document.createElement('div');
  timeLabelsCol.className = 'tt-time-labels-col';
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const label = document.createElement('div');
    label.className = 'tt-time-label-cell';
    label.textContent = `${String(hour).padStart(2, '0')}:00`;
    timeLabelsCol.appendChild(label);
  }
  grid.appendChild(timeLabelsCol);

  // 각 요일별 열 생성
  visibleDays.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = 'tt-day-col';
    dayCol.setAttribute('data-day', day.key);

    // 해당 요일 수업 렌더링
    const dayCourses = state.courses.filter(c => c.day === day.key);
    dayCourses.forEach(course => {
      const topPx = (course.startMin - START_MIN_DAY) * PIXELS_PER_MINUTE;
      const heightPx = (course.endMin - course.startMin) * PIXELS_PER_MINUTE;

      const block = document.createElement('article');
      block.className = 'course-block';
      block.style.top = `${topPx}px`;
      block.style.height = `${heightPx}px`;
      // 사용자가 지정한 RGB 색상 인라인 적용
      block.style.backgroundColor = course.color || 'rgb(79, 70, 229)';

      block.innerHTML = `
        <button type="button" class="course-delete-btn" data-id="${course.id}" aria-label="${course.title} 강의 삭제">&times;</button>
        <div class="course-title">${escapeHtml(course.title)}</div>
        <div class="course-loc">${escapeHtml(course.building || '미지정')}</div>
        <div class="course-time">${formatMinutesToTime(course.startMin)} ~ ${formatMinutesToTime(course.endMin)}</div>
      `;

      dayCol.appendChild(block);
    });

    // 해당 요일 공강 슬롯 렌더링
    const daySlots = freeSlotsByDay[day.key] || [];
    daySlots.forEach(slot => {
      const topPx = (slot.startMin - START_MIN_DAY) * PIXELS_PER_MINUTE;
      const heightPx = slot.duration * PIXELS_PER_MINUTE;

      const slotBlock = document.createElement('div');
      slotBlock.className = `free-slot-block ${slot.isLunch ? 'lunch-slot' : ''}`;
      slotBlock.style.top = `${topPx}px`;
      slotBlock.style.height = `${heightPx}px`;
      slotBlock.setAttribute('role', 'button');
      slotBlock.setAttribute('tabindex', '0');
      slotBlock.setAttribute('aria-label', `${slot.dayLabel} 공강 ${formatDuration(slot.duration)}, 클릭하여 추천 활동 확인`);

      slotBlock.innerHTML = `
        <div class="free-slot-title">${slot.isLunch ? '🍱 점심 공강' : '✨ 공강'} ${formatDuration(slot.duration)}</div>
        <div class="free-slot-meta">${formatMinutesToTime(slot.startMin)} ~ ${formatMinutesToTime(slot.endMin)}</div>
        <div class="free-slot-hint">👉 활용법 보기</div>
      `;

      // 클릭 시 '공강 활용' 탭으로 즉시 이동
      slotBlock.addEventListener('click', () => {
        navigateToTab('activities');
        filterActivitiesBySlot(slot.duration);
        showToast(`${slot.dayLabel} 공강(${formatDuration(slot.duration)})에 맞는 활동을 추천합니다!`);
      });

      dayCol.appendChild(slotBlock);
    });

    grid.appendChild(dayCol);
  });

  // 4. 하단 공강 리스트 요약 갱신
  renderFreeSlotsSummary(allSlots);
}

// 하단 요약 리스트
function renderFreeSlotsSummary(allSlots) {
  const list = document.getElementById('free-slots-list');
  if (!list) return;

  if (allSlots.length === 0) {
    list.innerHTML = `<p class="mission-empty">등록된 수업 간 30분 이상의 공강 구간이 없습니다.</p>`;
    return;
  }

  list.innerHTML = allSlots.map(slot => `
    <div class="free-slot-card">
      <div class="free-slot-card-header">
        <span class="free-slot-day">${slot.dayLabel}</span>
        <span class="free-slot-duration-badge">${formatDuration(slot.duration)}</span>
      </div>
      <p class="free-slot-context">
        <strong>${slot.prevCourse}</strong> 종료 후 ~ <strong>${slot.nextCourse}</strong> 시작 전<br>
        (${formatMinutesToTime(slot.startMin)} ~ ${formatMinutesToTime(slot.endMin)})
      </p>
      <button type="button" class="btn btn-outline btn-sm free-slot-action-btn" data-duration="${slot.duration}">
        이 시간 활용하기 &rarr;
      </button>
    </div>
  `).join('');

  // '이 시간 활용하기' 버튼 이벤트
  list.querySelectorAll('.free-slot-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = Number(btn.getAttribute('data-duration'));
      navigateToTab('activities');
      filterActivitiesBySlot(dur);
    });
  });
}

// ==========================================================================
// 7. 뷰 렌더링: 공강 활용 (Activities & Location)
// ==========================================================================
function updateLocationAndDeparture() {
  const currentLoc = state.currentLocation;
  const routeFrom = document.getElementById('route-from');
  const routeTo = document.getElementById('route-to');
  const routeTime = document.getElementById('route-time');
  const safeBadge = document.getElementById('safe-departure-badge');

  if (routeFrom) routeFrom.textContent = currentLoc;

  // 현재 요일에 등록된 수업 찾기
  const todayCourses = state.courses
    .filter(c => c.day === state.currentDay)
    .sort((a, b) => a.startMin - b.startMin);

  if (todayCourses.length === 0) {
    if (routeTo) routeTo.textContent = '등록된 다음 수업 없음';
    if (routeTime) routeTime.textContent = '-';
    if (safeBadge) {
      safeBadge.innerHTML = `<span aria-hidden="true">☕</span> 여유 시간 (등록된 수업 없음)`;
      safeBadge.style.background = '#64748b';
    }
    return;
  }

  const nextCourse = todayCourses[0];
  const nextClassBuilding = nextCourse.building || '강의실 미지정';
  const nextClassStartMin = nextCourse.startMin;

  const locTimes = WALKING_TIMES[currentLoc] || {};
  const walkMinutes = locTimes[nextClassBuilding] || locTimes['기본'] || 8;
  const bufferMinutes = 5; // PRD 안전 버퍼 5분

  const safeDepartureMin = Math.max(0, nextClassStartMin - walkMinutes - bufferMinutes);

  if (routeTo) routeTo.textContent = `${nextClassBuilding} (${nextCourse.title})`;
  if (routeTime) routeTime.textContent = `${walkMinutes}분`;

  if (safeBadge) {
    safeBadge.innerHTML = `<span aria-hidden="true">🚶‍♂️</span> 출발 권장: <strong>${formatMinutesToTime(safeDepartureMin)}</strong>`;
    safeBadge.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  }
}

function renderActivityCards() {
  const grid = document.getElementById('activity-cards-grid');
  if (!grid) return;

  const filter = state.activeDurationFilter;
  const filtered = filter === 'all' 
    ? RECOMMENDED_ACTIVITIES 
    : RECOMMENDED_ACTIVITIES.filter(a => a.durationCategory === filter);

  grid.innerHTML = filtered.map(act => {
    const isDone = state.completedMissions.some(m => m.id === act.id);
    return `
      <article class="activity-card ${isDone ? 'is-done' : ''}" id="card-${act.id}">
        <div class="activity-card-top">
          <div class="card-badges-row">
            <span class="badge badge-primary">${act.badge}</span>
            <span class="duration-tag">⏱️ ${act.durationLabel}</span>
          </div>
          <h4 class="activity-title">${escapeHtml(act.title)}</h4>
          <p class="activity-desc">${escapeHtml(act.desc)}</p>
          <div class="activity-place">
            <span aria-hidden="true">📍</span> ${escapeHtml(act.place)}
          </div>
        </div>
        <button type="button" 
                class="btn-complete-activity" 
                data-id="${act.id}" 
                data-title="${escapeHtml(act.title)}">
          ${isDone ? '✅ 실행 완료' : '이 활동 실행하기'}
        </button>
      </article>
    `;
  }).join('');

  // 완료 버튼 바인딩
  grid.querySelectorAll('.btn-complete-activity').forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.getAttribute('data-id');
      const actTitle = btn.getAttribute('data-title');
      toggleActivityMission(actId, actTitle);
    });
  });
}

function filterActivitiesBySlot(durationMinutes) {
  if (durationMinutes <= 30) {
    setActiveDurationFilter('short');
  } else if (durationMinutes <= 60) {
    setActiveDurationFilter('medium');
  } else if (durationMinutes <= 120) {
    setActiveDurationFilter('focus');
  } else {
    setActiveDurationFilter('deep');
  }
}

function setActiveDurationFilter(category) {
  state.activeDurationFilter = category;
  document.querySelectorAll('.time-filter-tabs .filter-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-duration') === category;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });
  renderActivityCards();
}

function toggleActivityMission(id, title) {
  const index = state.completedMissions.findIndex(m => m.id === id);
  if (index > -1) {
    state.completedMissions.splice(index, 1);
    showToast(`'${title}' 활동을 취소했습니다.`);
  } else {
    state.completedMissions.push({
      id: id,
      title: title,
      completedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    });
    showToast(`🎉 축하합니다! '${title}' 공강 미션을 완료했습니다!`);
  }
  saveStateToStorage();
  renderActivityCards();
  renderMissionList();
}

function renderMissionList() {
  const list = document.getElementById('mission-list');
  const badge = document.getElementById('mission-count-badge');
  if (!list) return;

  if (badge) {
    badge.textContent = `${state.completedMissions.length}개 완료`;
  }

  if (state.completedMissions.length === 0) {
    list.innerHTML = `<li class="mission-empty">아직 완료한 활동이 없습니다. 위 카드에서 <strong>[이 활동 실행하기]</strong> 버튼을 눌러보세요!</li>`;
    return;
  }

  list.innerHTML = state.completedMissions.map(m => `
    <li class="mission-item">
      <span class="mission-item-text">✨ ${escapeHtml(m.title)}</span>
      <span class="mission-item-time">${m.completedAt} 달성</span>
    </li>
  `).join('');
}

// ==========================================================================
// 8. 뷰 렌더링: 친구 추가 & 밥메이트 (Friends & Match)
// ==========================================================================
function renderFriendsList() {
  const list = document.getElementById('friend-items-list');
  const countEl = document.getElementById('friend-count');
  if (!list) return;

  if (countEl) countEl.textContent = state.friends.length;

  if (state.friends.length === 0) {
    list.innerHTML = `<li class="mission-empty">아직 등록된 친구가 없습니다. 친구 코드를 입력해 추가해보세요!</li>`;
    return;
  }

  list.innerHTML = state.friends.map(f => {
    const isFree = f.status === '공강 중';
    return `
      <li class="friend-item">
        <div class="friend-info-left">
          <div class="friend-avatar" aria-hidden="true">${escapeHtml(f.avatar || f.name[0])}</div>
          <div class="friend-meta">
            <span class="friend-name">${escapeHtml(f.name)} <small style="color:#64748b; font-size:0.75rem;">(${escapeHtml(f.code)})</small></span>
            <span class="friend-dept">${escapeHtml(f.dept)}</span>
          </div>
        </div>
        <div class="friend-info-right">
          <span class="friend-status-tag ${isFree ? 'status-free' : 'status-class'}">${f.status}</span>
          <span class="friend-overlap-time">${escapeHtml(f.freeSlotText)}</span>
        </div>
      </li>
    `;
  }).join('');
}

// ==========================================================================
// 9. 탭 전환 및 네비게이션 제어
// ==========================================================================
function navigateToTab(tabName) {
  const sections = {
    schedule: document.getElementById('section-schedule'),
    activities: document.getElementById('section-activities'),
    friends: document.getElementById('section-friends')
  };

  const navTabs = {
    schedule: document.getElementById('tab-schedule'),
    activities: document.getElementById('tab-activities'),
    friends: document.getElementById('tab-friends')
  };

  // 모든 섹션 비활성화
  Object.keys(sections).forEach(key => {
    if (sections[key]) {
      sections[key].classList.remove('active');
      sections[key].hidden = true;
    }
  });

  // 모든 헤더 탭 비활성화
  Object.keys(navTabs).forEach(key => {
    if (navTabs[key]) {
      navTabs[key].classList.remove('active');
      navTabs[key].removeAttribute('aria-current');
    }
  });

  // 모바일 드로어 닫기 및 항목 동기화
  const drawer = document.getElementById('mobile-nav-drawer');
  if (drawer) drawer.classList.remove('open');
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-target') === `section-${tabName}`);
  });

  // 선택된 탭 활성화
  const activeSection = sections[tabName];
  const activeTabBtn = navTabs[tabName];

  if (activeSection) {
    activeSection.classList.add('active');
    activeSection.hidden = false;
  }
  if (activeTabBtn) {
    activeTabBtn.classList.add('active');
    activeTabBtn.setAttribute('aria-current', 'page');
  }

  // 섹션별 갱신
  if (tabName === 'schedule') {
    renderTimetable();
  } else if (tabName === 'activities') {
    updateLocationAndDeparture();
    renderActivityCards();
  } else if (tabName === 'friends') {
    renderFriendsList();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 10. 모달 및 폼 제어
// ==========================================================================
function setupModals() {
  const modal = document.getElementById('course-modal-overlay');
  const btnOpen = document.getElementById('btn-open-course-modal');
  const btnClose = document.getElementById('modal-close-btn');
  const btnCancel = document.getElementById('btn-cancel-course');
  const form = document.getElementById('course-form');

  // 초기 상태에서 모달이 확실히 숨겨지도록 처리
  if (modal) {
    modal.hidden = true;
    modal.classList.remove('active');
  }

  // RGB 색상 컨트롤 요소들
  const inputR = document.getElementById('color-r');
  const inputG = document.getElementById('color-g');
  const inputB = document.getElementById('color-b');
  const pickerNative = document.getElementById('color-picker-native');
  const previewBox = document.getElementById('rgb-preview');
  const displayText = document.getElementById('rgb-display-text');
  const hiddenColorInput = document.getElementById('course-color');

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Number(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function updateRgbValues(r, g, b, syncNative = true) {
    r = Math.max(0, Math.min(255, Number(r) || 0));
    g = Math.max(0, Math.min(255, Number(g) || 0));
    b = Math.max(0, Math.min(255, Number(b) || 0));

    if (inputR) inputR.value = r;
    if (inputG) inputG.value = g;
    if (inputB) inputB.value = b;

    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    if (previewBox) previewBox.style.backgroundColor = rgbStr;
    if (displayText) displayText.textContent = rgbStr;
    if (hiddenColorInput) hiddenColorInput.value = rgbStr;

    if (syncNative && pickerNative) {
      pickerNative.value = rgbToHex(r, g, b);
    }
  }

  // R, G, B 숫자 인풋 이벤트 바인딩
  [inputR, inputG, inputB].forEach(input => {
    input?.addEventListener('input', () => {
      updateRgbValues(inputR.value, inputG.value, inputB.value, true);
    });
  });

  // 색상환(네이티브 컬러 피커) 이벤트 바인딩
  pickerNative?.addEventListener('input', e => {
    const { r, g, b } = hexToRgb(e.target.value);
    updateRgbValues(r, g, b, false);
  });

  // 추천 RGB 프리셋 칩 클릭 이벤트 바인딩
  document.querySelectorAll('.rgb-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const r = chip.getAttribute('data-r');
      const g = chip.getAttribute('data-g');
      const b = chip.getAttribute('data-b');
      updateRgbValues(r, g, b, true);
    });
  });

  const openModal = () => {
    if (modal) {
      modal.hidden = false;
      modal.classList.add('active');
    }
    // 기본 RGB 초기화
    updateRgbValues(79, 70, 229, true);
    document.getElementById('course-title')?.focus();
  };

  const closeModal = () => {
    if (modal) {
      modal.hidden = true;
      modal.classList.remove('active');
    }
    form?.reset();
  };

  btnOpen?.addEventListener('click', openModal);
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);

  // Esc 키 누를 때 모달 닫기 (웹 접근성)
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  // 모달 배경 클릭 시 닫기
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // 강의 추가 폼 제출 핸들링
  form?.addEventListener('submit', e => {
    e.preventDefault();

    const title = document.getElementById('course-title').value.trim();
    const day = document.getElementById('course-day').value;
    const building = document.getElementById('course-building').value.trim() || '강의실 미지정';
    const startTimeStr = document.getElementById('course-start').value;
    const endTimeStr = document.getElementById('course-end').value;

    const startMin = parseTimeToMinutes(startTimeStr);
    const endMin = parseTimeToMinutes(endTimeStr);

    if (startMin >= endMin) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    // 지정된 RGB 색상 값 가져오기
    const chosenRgbColor = hiddenColorInput?.value || `rgb(${inputR?.value || 79}, ${inputG?.value || 70}, ${inputB?.value || 229})`;

    const newCourse = {
      id: 'c_' + Date.now(),
      title,
      day,
      startMin,
      endMin,
      building,
      color: chosenRgbColor
    };

    state.courses.push(newCourse);
    saveStateToStorage();
    renderTimetable();
    closeModal();
    showToast(`새 강의 '${title}'(이)가 지정된 색상으로 추가되었습니다.`);
  });
}

// ==========================================================================
// 11. 이벤트 리스너 바인딩 및 초기화
// ==========================================================================
function setupEventListeners() {
  // 1. 상단 메뉴 탭 클릭
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSectionId = btn.getAttribute('data-target');
      const tabName = targetSectionId.replace('section-', '');
      navigateToTab(tabName);
    });
  });

  // 2. 모바일 햄버거 토글
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  mobileToggle?.addEventListener('click', () => {
    const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', String(!isExpanded));
    drawer?.classList.toggle('open');
  });

  // 3. 모바일 드로어 아이템 클릭
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetSectionId = item.getAttribute('data-target');
      const tabName = targetSectionId.replace('section-', '');
      navigateToTab(tabName);
    });
  });

  // 4. 모바일 요일 필터 버튼들
  document.querySelectorAll('.mobile-day-tabs .day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mobile-day-tabs .day-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedViewDay = tab.getAttribute('data-day');
      renderTimetable();
    });
  });

  // 5. 강의 삭제 버튼 (이벤트 위임)
  document.getElementById('timetable-grid')?.addEventListener('click', e => {
    const delBtn = e.target.closest('.course-delete-btn');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-id');
      const course = state.courses.find(c => c.id === id);
      if (course && confirm(`'${course.title}' 강의를 삭제하시겠습니까?`)) {
        state.courses = state.courses.filter(c => c.id !== id);
        saveStateToStorage();
        renderTimetable();
        showToast(`'${course.title}' 강의가 삭제되었습니다.`);
      }
    }
  });

  // 6. 샘플 시간표 불러오기
  document.getElementById('btn-load-sample')?.addEventListener('click', () => {
    if (confirm('PRD 샘플 시간표를 불러오시겠습니까? (기존 시간표를 덮어씁니다)')) {
      state.courses = [...SAMPLE_COURSES];
      saveStateToStorage();
      renderTimetable();
      showToast('📥 샘플 시간표를 성공적으로 불러왔습니다!');
    }
  });

  // 7. 시간표 비우기 (빈 시간표로 만들기)
  document.getElementById('btn-clear-schedule')?.addEventListener('click', () => {
    if (confirm('시간표를 모두 비우시겠습니까?')) {
      state.courses = [];
      saveStateToStorage();
      renderTimetable();
      showToast('🗑️ 시간표가 모두 비워졌습니다.');
    }
  });

  // 7. 위치 칩 선택 (F3)
  document.querySelectorAll('.location-chips .loc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.location-chips .loc-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      state.currentLocation = chip.getAttribute('data-loc');
      updateLocationAndDeparture();
      showToast(`내 위치가 '${state.currentLocation}'(으)로 변경되었습니다.`);
    });
  });

  // 8. 활동 길이 필터 버튼
  document.querySelectorAll('.time-filter-tabs .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const duration = btn.getAttribute('data-duration');
      setActiveDurationFilter(duration);
    });
  });

  // 9. "밥 먹자!" 원탭 알림 발송 (PRD F4)
  const btnLunchCall = document.getElementById('btn-send-lunch-call');
  const lunchStatus = document.getElementById('lunch-call-status');
  btnLunchCall?.addEventListener('click', () => {
    state.lunchCallSent = true;
    btnLunchCall.classList.remove('btn-primary');
    btnLunchCall.classList.add('btn-secondary');
    btnLunchCall.innerHTML = '<span>✔️</span> 알림 발송 완료!';
    if (lunchStatus) {
      lunchStatus.textContent = '민지, 수현이에게 "밥 먹자!" 푸시 알림을 보냈습니다. (답장 대기 중)';
      lunchStatus.style.color = '#047857';
    }
    showToast('🍱 친구들에게 밥 약속 알림을 보냈습니다!');
  });

  // 10. 내 친구 코드 복사
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const code = document.getElementById('my-friend-code')?.textContent || 'KIM-9021';
    navigator.clipboard?.writeText(code).then(() => {
      showToast(`친구 코드(${code})가 클립보드에 복사되었습니다!`);
    }).catch(() => {
      showToast(`친구 코드: ${code}`);
    });
  });

  // 11. 친구 추가 폼 제출
  const friendForm = document.getElementById('friend-add-form');
  friendForm?.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('input-friend-code');
    const val = input.value.trim();
    if (!val) return;

    const newFriend = {
      id: 'f_' + Date.now(),
      name: val,
      code: 'F-' + Math.floor(1000 + Math.random() * 9000),
      dept: '새내기 친구',
      status: '공강 중',
      freeSlotText: '13:00 ~ 14:30 공강 (화)',
      overlapToday: '13:00 ~ 13:45 (45분 겹침)',
      avatar: val[0] || '친'
    };

    state.friends.unshift(newFriend);
    saveStateToStorage();
    renderFriendsList();
    input.value = '';
    showToast(`'${val}' 친구가 성공적으로 등록되었습니다!`);
  });

  // 12. 시뮬레이션 요일 변경
  document.getElementById('sim-day-select')?.addEventListener('change', e => {
    state.currentDay = e.target.value;
    const dayObj = DAYS.find(d => d.key === state.currentDay);
    const label = document.getElementById('today-datetime-label');
    const msg = document.getElementById('quick-status-msg');

    if (label && dayObj) {
      label.textContent = `오늘: 2026년 9월 15일 (${dayObj.short}) 11:30`;
    }
    if (msg && dayObj) {
      msg.innerHTML = `🎉 <strong>${dayObj.label} 시간표 기준:</strong> 공강 시간과 친구 매칭을 확인하세요.`;
    }
    showToast(`시뮬레이션 요일이 [${dayObj?.label}]로 전환되었습니다.`);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ==========================================================================
// 12. 진입점 (DOM 준비 완료 시 실행)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  setupEventListeners();
  setupModals();

  // 초기 렌더링
  renderTimetable();
  renderActivityCards();
  renderMissionList();
  renderFriendsList();
  updateLocationAndDeparture();
});

