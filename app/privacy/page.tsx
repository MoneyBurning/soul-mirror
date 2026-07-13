'use client';

import { useState } from 'react';
import Link from 'next/link';

type Lang = 'ko' | 'en';

interface PolicySection {
  id: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string[];
  bodyEn: string[];
}

const DISCLAIMER_KO =
  '⚠️ 본 문서는 일반적인 정보 제공을 목적으로 작성된 템플릿이며 법률 자문을 대체하지 않습니다. 실제 서비스에 적용하시기 전 캐나다 개인정보보호법(PIPEDA) 전문 변호사의 검토를 받으시기를 권장합니다.';
const DISCLAIMER_EN =
  '⚠️ This document is a general template provided for informational purposes and does not constitute legal advice. We recommend having it reviewed by a lawyer experienced in Canadian privacy law (PIPEDA) before relying on it in production.';

const INTRO_KO =
  "Soul Mirror('당사', '서비스')는 이용자의 개인정보를 소중히 여기며, 캐나다 개인정보보호 및 전자문서법(Personal Information Protection and Electronic Documents Act, PIPEDA)을 비롯한 관련 법령을 준수하기 위해 최선을 다하고 있습니다. 본 개인정보처리방침은 당사가 어떤 개인정보를 수집·이용·저장·공개하는지, 그리고 이용자가 자신의 정보에 대해 어떤 권리를 가지는지를 설명합니다.";
const INTRO_EN =
  "Soul Mirror (\"we\", \"us\", \"our\", or the \"Service\") respects your privacy and is committed to complying with the Personal Information Protection and Electronic Documents Act (PIPEDA) and other applicable Canadian privacy laws. This Privacy Policy explains what personal information we collect, how we use, store, and disclose it, and what rights you have over your information.";

const SECTIONS: PolicySection[] = [
  {
    id: 'collect',
    titleKo: '수집하는 개인정보 항목',
    titleEn: 'Information We Collect',
    bodyKo: [
      'Google OAuth를 통한 회원가입 및 로그인 과정에서 아래 정보를 수집합니다.',
      '- 이름 (Google 계정에 등록된 이름)\n- 이메일 주소\n- 프로필 사진 (Google 계정의 프로필 이미지)',
      '또한 서비스 이용 과정에서 아래와 같은 정보가 추가로 생성·수집됩니다.',
      '- 이용자가 입력한 타로 리딩 질문 및 선택한 카테고리\n- AI가 생성한 리딩 응답 내용\n- 이용자가 선택한 감정 상태 및 리얼리티 체크 평가 점수·메모\n- 서비스 이용 기록 (리딩 생성 일시, 요청 빈도 등 이용 통계)',
      '당사는 신용카드 정보, 주민등록번호, 생체 정보 등 민감한 개인정보는 수집하지 않습니다.',
    ],
    bodyEn: [
      'When you sign up or log in via Google OAuth, we collect:',
      "- Your name (as registered with your Google account)\n- Your email address\n- Your profile picture (from your Google account)",
      'In the course of using the Service, we also generate and collect:',
      '- The tarot reading questions and categories you submit\n- AI-generated reading responses\n- The emotions you select and the reality-check scores/notes you provide\n- Usage records (timestamps of readings, request frequency, and similar usage statistics)',
      'We do not collect sensitive personal information such as credit card numbers, government identification numbers, or biometric data.',
    ],
  },
  {
    id: 'purpose',
    titleKo: '개인정보 수집 및 이용 목적',
    titleEn: 'Purpose of Collection and Use',
    bodyKo: [
      '당사는 수집한 개인정보를 다음의 목적으로만 이용합니다.',
      '- 회원 식별 및 인증 (Google OAuth 로그인 처리)\n- 서비스 제공: AI 기반 타로 리딩 생성, 리딩 기록(타임라인) 제공\n- 서비스 남용 방지를 위한 요청 빈도 제한(rate limiting)\n- 서비스 품질 개선 및 오류 대응\n- 법적 의무 이행 및 이용자 문의 응대',
      '당사는 이용자의 사전 동의 없이 수집 목적 범위를 벗어나 개인정보를 이용하지 않습니다. 목적이 변경될 경우 사전에 고지하고 필요한 경우 별도의 동의를 받습니다.',
    ],
    bodyEn: [
      'We use the personal information we collect solely for the following purposes:',
      '- Identifying and authenticating you (processing Google OAuth login)\n- Providing the Service: generating AI-based tarot readings and maintaining your reading history (timeline)\n- Rate-limiting requests to prevent abuse of the Service\n- Improving service quality and diagnosing errors\n- Complying with legal obligations and responding to user inquiries',
      'We do not use personal information beyond the scope of these purposes without your prior consent. If the purpose of use changes, we will notify you in advance and obtain additional consent where required.',
    ],
  },
  {
    id: 'consent',
    titleKo: '동의',
    titleEn: 'Consent',
    bodyKo: [
      "Google 계정으로 로그인함으로써 이용자는 본 방침에 따른 개인정보 수집·이용에 동의하는 것으로 간주됩니다. 이용자는 언제든지 동의를 철회할 수 있으며, 동의 철회 시 계정 삭제 및 서비스 이용이 제한될 수 있습니다. 동의 철회를 원하시는 경우 아래 '문의처'를 통해 요청해 주세요.",
    ],
    bodyEn: [
      "By signing in with your Google account, you consent to the collection and use of your personal information as described in this Policy. You may withdraw your consent at any time; however, doing so may result in account deletion and limit your ability to use the Service. To withdraw consent, please contact us using the information in the \"Contact Us\" section below.",
    ],
  },
  {
    id: 'disclosure',
    titleKo: '제3자 제공 및 처리위탁',
    titleEn: 'Disclosure to Third Parties and Service Providers',
    bodyKo: [
      '당사는 이용자의 개인정보를 원칙적으로 제3자에게 판매하거나 마케팅 목적으로 제공하지 않습니다. 다만 서비스 제공을 위해 아래의 서비스 제공업체(처리수탁자)에게 필요한 최소한의 정보를 위탁합니다.',
      '- Google LLC: OAuth 인증 처리 (이름, 이메일, 프로필 사진)\n- Supabase, Inc.: 데이터베이스 호스팅 및 인증 세션 관리 (전체 계정·서비스 이용 데이터)\n- Groq, Inc.: 이용자가 입력한 리딩 질문 및 선택한 카드 정보를 전달받아 AI 리딩 텍스트를 생성 (질문 내용, 카드명)',
      '각 처리수탁자는 자체 개인정보처리방침에 따라 정보를 처리하며, 당사는 서비스 제공 목적 범위 내에서만 정보가 이용되도록 계약 및 기술적 조치를 통해 관리합니다. 법령에 의해 요구되는 경우(수사기관의 적법한 요청 등)를 제외하고는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.',
    ],
    bodyEn: [
      'We do not sell your personal information or share it with third parties for marketing purposes. To operate the Service, we share the minimum necessary information with the following service providers (processors):',
      '- Google LLC: processes OAuth authentication (name, email, profile picture)\n- Supabase, Inc.: hosts our database and manages authentication sessions (all account and service-usage data)\n- Groq, Inc.: receives your reading questions and the names of the cards you draw in order to generate AI reading text (question content, card names)',
      'Each processor handles information in accordance with its own privacy policy, and we use contractual and technical safeguards to ensure information is used only within the scope of providing the Service. We do not disclose personal information to third parties without your consent, except where required by law (such as a lawful request from a law enforcement authority).',
    ],
  },
  {
    id: 'transfer',
    titleKo: '개인정보의 국외 이전 및 저장 위치',
    titleEn: 'Cross-Border Data Transfer and Storage Location',
    bodyKo: [
      '당사의 주 데이터베이스(Supabase)는 AWS ca-central-1(캐나다) 리전에 호스팅되어 있어, 이용자의 개인정보는 원칙적으로 캐나다 국내에 저장됩니다. 다만 Google(OAuth 인증) 및 Groq(AI 리딩 생성)와 같은 처리수탁자는 캐나다 국외(예: 미국 등)의 서버에서 정보를 처리할 수 있습니다. 이 경우 이용자의 개인정보는 해당 국가의 법률에 따라 정부기관 등에 의해 접근될 수 있습니다. 당사는 PIPEDA가 요구하는 수준에 부합하는 보호조치를 각 처리수탁자가 제공하는지 확인하며, 국외 이전에 따른 위험을 최소화하기 위해 노력합니다.',
    ],
    bodyEn: [
      "Our primary database (Supabase) is hosted in the AWS ca-central-1 (Canada) region, so your personal information is stored within Canada by default. However, service providers such as Google (OAuth authentication) and Groq (AI reading generation) may process information on servers located outside Canada (for example, in the United States). In such cases, your information may be accessible to government authorities under the laws of that jurisdiction. We take steps to confirm that our service providers offer protections consistent with PIPEDA's requirements and to minimize the risks associated with cross-border transfers.",
    ],
  },
  {
    id: 'retention',
    titleKo: '보유 기간',
    titleEn: 'Retention Period',
    bodyKo: [
      '당사는 이용자가 계정을 유지하는 동안 개인정보를 보유합니다. 이용자가 계정 삭제를 요청하는 경우, 법령상 별도 보관 의무가 있는 경우를 제외하고 합리적인 기간 내에 개인정보를 삭제하거나 식별 불가능하도록 처리합니다. 리딩 기록, 리얼리티 체크 등 서비스 이용 데이터는 계정과 함께 삭제됩니다.',
    ],
    bodyEn: [
      'We retain your personal information for as long as your account remains active. If you request account deletion, we will delete or anonymize your personal information within a reasonable period, except where we are legally required to retain it. Service-usage data such as readings and reality checks are deleted together with your account.',
    ],
  },
  {
    id: 'security',
    titleKo: '안전성 확보 조치',
    titleEn: 'Security Safeguards',
    bodyKo: [
      '당사는 개인정보를 안전하게 보호하기 위해 다음과 같은 기술적·관리적 조치를 취하고 있습니다.',
      '- 전송 구간 암호화 (HTTPS/TLS)\n- 데이터베이스 접근 제어: Row Level Security(RLS)를 통해 이용자는 본인의 데이터에만 접근 가능\n- 서비스 역할(service role) 키 등 민감한 인증정보의 서버 측 분리 보관\n- 인증 세션 관리 및 정기적인 보안 점검',
      '다만 인터넷을 통한 정보 전송은 완전히 안전할 수 없으므로, 당사는 절대적인 보안을 보장할 수 없습니다. 보안 사고 발생 시 관련 법령에 따라 지체 없이 이용자에게 통지하고 필요한 조치를 취합니다.',
    ],
    bodyEn: [
      'We implement the following technical and administrative safeguards to protect your personal information:',
      '- Encryption in transit (HTTPS/TLS)\n- Database access controls via Row Level Security (RLS), so that users can only access their own data\n- Server-side isolation of sensitive credentials such as service role keys\n- Session management and periodic security reviews',
      'However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security. In the event of a security breach, we will notify affected users without undue delay and take appropriate remedial action in accordance with applicable law.',
    ],
  },
  {
    id: 'rights',
    titleKo: '이용자의 권리',
    titleEn: 'Your Rights',
    bodyKo: [
      'PIPEDA는 이용자에게 자신의 개인정보에 대한 다음과 같은 권리를 보장합니다.',
      '- 열람권: 당사가 보유한 본인의 개인정보 열람을 요청할 권리\n- 정정·수정권: 부정확하거나 불완전한 정보의 수정을 요청할 권리\n- 동의 철회권: 개인정보 수집·이용에 대한 동의를 철회할 권리\n- 삭제권: 계정 및 관련 개인정보의 삭제를 요청할 권리\n- 이의제기권: 당사의 개인정보 처리에 대해 이의를 제기하고 그 처리 경과를 확인할 권리',
      "위 권리 행사를 원하시는 경우 아래 '문의처'로 연락해 주시기 바라며, 당사는 합리적인 기간 내(원칙적으로 30일 이내) 응답합니다.",
    ],
    bodyEn: [
      'Under PIPEDA, you have the following rights regarding your personal information:',
      '- Right of access: to request access to the personal information we hold about you\n- Right to correction: to request correction of inaccurate or incomplete information\n- Right to withdraw consent: to withdraw your consent to the collection and use of your personal information\n- Right to deletion: to request deletion of your account and associated personal information\n- Right to challenge compliance: to challenge our compliance with this Policy and be informed of the outcome',
      'To exercise these rights, please contact us using the information in the "Contact Us" section below. We will respond within a reasonable time, generally within 30 days.',
    ],
  },
  {
    id: 'cookies',
    titleKo: '쿠키 및 세션 정보',
    titleEn: 'Cookies and Session Information',
    bodyKo: [
      '당사는 로그인 상태 유지를 위해 필수적인 쿠키(세션 인증 쿠키)를 사용합니다. 이 쿠키는 서비스 이용에 필수적이며, 마케팅이나 추적 목적의 제3자 쿠키는 사용하지 않습니다. 브라우저 설정을 통해 쿠키를 차단할 수 있으나, 이 경우 로그인 등 일부 기능이 정상적으로 동작하지 않을 수 있습니다.',
    ],
    bodyEn: [
      'We use cookies that are strictly necessary to maintain your login session. These cookies are essential to the operation of the Service, and we do not use third-party cookies for marketing or tracking purposes. You may block cookies through your browser settings, but doing so may prevent certain features, such as login, from working correctly.',
    ],
  },
  {
    id: 'children',
    titleKo: '아동의 개인정보',
    titleEn: "Children's Privacy",
    bodyKo: [
      '본 서비스는 만 13세 미만 아동을 대상으로 하지 않으며, 당사는 만 13세 미만 아동으로부터 고의로 개인정보를 수집하지 않습니다. 만 13세 미만 아동의 개인정보가 수집된 사실을 인지한 경우, 당사는 이를 지체 없이 삭제합니다.',
    ],
    bodyEn: [
      'The Service is not directed at children under the age of 13, and we do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will delete it without undue delay.',
    ],
  },
  {
    id: 'changes',
    titleKo: '개인정보처리방침의 변경',
    titleEn: 'Changes to This Policy',
    bodyKo: [
      '당사는 법령, 정책 또는 서비스 변경에 따라 본 방침을 개정할 수 있습니다. 중요한 변경이 있는 경우 서비스 내 공지 또는 이메일을 통해 사전에 고지합니다. 변경된 방침은 본 페이지에 게시된 시점부터 효력이 발생합니다.',
    ],
    bodyEn: [
      'We may amend this Policy from time to time to reflect changes in law, our policies, or the Service. We will provide advance notice of material changes through an in-service notice or by email. Any revised Policy takes effect upon posting to this page.',
    ],
  },
  {
    id: 'contact',
    titleKo: '개인정보보호책임자 및 문의처',
    titleEn: 'Privacy Officer and Contact Information',
    bodyKo: [
      '당사는 개인정보 처리에 관한 업무를 총괄하고 이용자의 문의·불만을 처리하기 위하여 개인정보보호책임자를 지정하고 있습니다.',
      '개인정보보호책임자: Soul Mirror Team\n이메일: nickpark.blog@gmail.com',
      '개인정보 관련 문의, 열람·정정·삭제 요청은 위 이메일로 접수해 주시기 바랍니다.',
    ],
    bodyEn: [
      'We have designated a Privacy Officer who is accountable for our compliance with this Policy and who handles user inquiries and complaints.',
      'Privacy Officer: Soul Mirror Team\nEmail: nickpark.blog@gmail.com',
      'Please direct privacy-related inquiries, and requests for access, correction, or deletion, to the email address above.',
    ],
  },
  {
    id: 'opc',
    titleKo: '캐나다 개인정보보호위원회에 대한 민원 제기',
    titleEn: 'Complaints to the Privacy Commissioner of Canada',
    bodyKo: [
      '당사의 개인정보 처리에 대해 이의가 있으시거나 문제가 해결되지 않은 경우, 이용자는 캐나다 개인정보보호위원회(Office of the Privacy Commissioner of Canada, OPC)에 민원을 제기할 수 있습니다.',
      'Office of the Privacy Commissioner of Canada\n웹사이트: www.priv.gc.ca\n전화: 1-800-282-1376',
    ],
    bodyEn: [
      'If you have concerns about how we handle your personal information that we have not resolved to your satisfaction, you may file a complaint with the Office of the Privacy Commissioner of Canada (OPC).',
      'Office of the Privacy Commissioner of Canada\nWebsite: www.priv.gc.ca\nPhone: 1-800-282-1376',
    ],
  },
];

function renderParagraphs(paragraphs: string[]) {
  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.split('\n');
    const isList = lines.every((line) => line.startsWith('- '));

    if (isList) {
      return (
        <ul key={index} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-purple-100">
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{line.replace(/^- /, '')}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={index} className="whitespace-pre-line text-sm leading-relaxed text-purple-100">
        {paragraph}
      </p>
    );
  });
}

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<Lang>('ko');

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-amber-200 sm:text-3xl">
            {lang === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
          </h1>
          <div className="flex gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLang('ko')}
              aria-pressed={lang === 'ko'}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                lang === 'ko'
                  ? 'bg-amber-400 text-purple-950'
                  : 'border border-purple-400/40 text-purple-200 hover:bg-purple-800/40'
              }`}
            >
              한국어
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                lang === 'en'
                  ? 'bg-amber-400 text-purple-950'
                  : 'border border-purple-400/40 text-purple-200 hover:bg-purple-800/40'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <p className="text-xs text-purple-300/60">
          {lang === 'ko' ? '시행일: 2026년 7월 15일' : 'Effective Date: July 15, 2026'}
        </p>

        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-200">
          {lang === 'ko' ? DISCLAIMER_KO : DISCLAIMER_EN}
        </div>

        <p className="text-sm leading-relaxed text-purple-100">
          {lang === 'ko' ? INTRO_KO : INTRO_EN}
        </p>

        {SECTIONS.map((section, index) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-amber-200">
              {index + 1}. {lang === 'ko' ? section.titleKo : section.titleEn}
            </h2>
            {renderParagraphs(lang === 'ko' ? section.bodyKo : section.bodyEn)}
          </section>
        ))}

        <Link href="/" className="text-xs font-medium text-amber-300 hover:underline">
          {lang === 'ko' ? '← 홈으로 돌아가기' : '← Back to Home'}
        </Link>
      </div>
    </div>
  );
}
