/**
 * Engine-driven room puzzles (Ch2–Ch14 expansion rooms).
 */
const EngineRooms = (() => {
  const opt = (id, text, correct, ctx = 'default') => ({ id, text, correct, ctx });

  const ROOMS = {
    credential_audit: {
      type: 'options', uiType: 'toggle', theme: 'dos',
      scenario: 'Security audit found shared admin credentials on a wiki page.',
      prompt: 'Enable the correct policy toggles (select the best answer):',
      submitLabel: 'APPLY POLICY',
      options: [
        opt('a', 'Rotate passwords quarterly only', false),
        opt('b', 'Unique credentials per user + vault + disable shared accounts', true, 'correct'),
        opt('c', 'Post new passwords on the intranet', false),
        opt('d', 'Use the same passphrase for all admins', false),
      ],
    },
    dead_drop: {
      type: 'options', uiType: 'dashboard', theme: 'military',
      scenario: 'DNS monitor flagged suspicious TXT query bursts.',
      prompt: 'Review the alert feed and choose the best analysis:',
      submitLabel: 'ANALYZE',
      alerts: ['TXT query burst: update-cache-9f2a.net', 'Hourly beacon pattern detected', 'No A-record for domain'],
      options: [
        opt('a', 'Caching CDN performance tests', false),
        opt('b', 'Exfiltrating commands via DNS tunneling', true, 'correct'),
        opt('c', 'Legitimate Windows Update traffic', false),
        opt('d', 'Employee VPN reconnects', false),
      ],
    },
    ch3_boss: {
      type: 'options', uiType: 'ranked', theme: 'military', isBoss: true,
      scenario: 'Decoded traffic orders: deploy ransomware at 0600. Pick the containment pair in priority order.',
      prompt: 'Click actions in the correct priority order (1st, then 2nd):',
      submitLabel: 'EXECUTE',
      rankedKey: 'b',
      options: [
        opt('a', 'Ignore until 0600; run backups then', false),
        opt('b', 'Isolate C2 hosts + block outbound DNS to drop domain', true, 'correct'),
        opt('c', 'Email all staff the decoded message', false),
        opt('d', 'Pay ransom early for discount', false),
      ],
    },
    api_breach: {
      type: 'options', theme: 'server',
      scenario: 'API key AKIA…EXAMPLE leaked in a public GitHub repo. Calls show ListBuckets from unknown IP.',
      prompt: 'First response step:',
      submitLabel: 'CONTAIN',
      options: [
        opt('a', 'Delete the GitHub repo silently', false),
        opt('b', 'Revoke/rotate the key + audit API logs for abuse', true, 'correct'),
        opt('c', 'Change company logo', false),
        opt('d', 'Disable MFA globally', false),
      ],
    },
    ch4_boss: {
      type: 'options', uiType: 'ranked', theme: 'server', isBoss: true,
      scenario: 'Customer DB dump in progress. Attacker uses stolen API key and SQLi foothold.',
      prompt: 'Rank the priority actions — select the best combined response:',
      submitLabel: 'SAVE DB',
      rankedKey: 'a',
      options: [
        opt('a', 'Revoke keys, patch SQLi, restore from clean backup', true, 'correct'),
        opt('b', 'Reboot web servers only', false),
        opt('c', 'Email customers first', false),
        opt('d', 'Disable all employee logins permanently', false),
      ],
    },
    network: {
      type: 'options', uiType: 'dashboard', theme: 'bank',
      scenario: 'NetFlow analyzer shows periodic outbound bursts from an internal workstation.',
      prompt: 'Classify the traffic pattern:',
      submitLabel: 'CLASSIFY',
      alerts: ['10.0.4.22 → 185.220.101.44:443 every 90s', '4 KB burst size — consistent interval', 'No matching user session'],
      options: [
        opt('a', 'Normal software update', false),
        opt('b', 'C2 beaconing to external IP', true, 'correct'),
        opt('c', 'Video streaming', false),
        opt('d', 'DNS cache refresh', false),
      ],
    },
    ch5_boss: {
      type: 'options', uiType: 'ranked', theme: 'bank', isBoss: true,
      scenario: 'Attacker located at 203.45.67.89 with active C2. Multiple hosts compromised.',
      prompt: 'Threat hunt boss — choose the best containment plan:',
      submitLabel: 'HUNT',
      rankedKey: 'a',
      options: [
        opt('a', 'Block attacker IP + isolate compromised hosts + preserve logs', true, 'correct'),
        opt('b', 'Reboot all workstations immediately', false),
        opt('c', 'Disable the SIEM to reduce noise', false),
        opt('d', 'Allow traffic for continued monitoring only', false),
      ],
    },
    physical: {
      type: 'options', uiType: 'toggle', theme: 'soc',
      scenario: 'Tailgating reported at lobby. Unknown USB drive found on a desk.',
      prompt: 'Select the correct physical security response:',
      submitLabel: 'RESPOND',
      options: [
        opt('a', 'Plug USB into SOC workstation to inspect', false),
        opt('b', 'Report tailgating, quarantine USB, notify physical security', true, 'correct'),
        opt('c', 'Ignore — probably an employee', false),
        opt('d', 'Post photos of USB on social media', false),
      ],
    },
    ch9_boss: {
      type: 'options', uiType: 'ranked', theme: 'server', isBoss: true,
      scenario: 'Cloud breach: public buckets, rogue IAM, exposed keys.',
      prompt: 'Complete org-wide cloud lockdown:',
      submitLabel: 'LOCK CLOUD',
      rankedKey: 'a',
      options: [
        opt('a', 'Org-wide SCP deny-public + key rotation + access review', true, 'correct'),
        opt('b', 'Migrate to new cloud without fixes', false),
        opt('c', 'Disable all cloud accounts forever', false),
        opt('d', 'Email root passwords to SOC', false),
      ],
    },
    ai_phishing: {
      type: 'options', uiType: 'dashboard', theme: 'server',
      scenario: 'Executive assistant receives a voice clone request for urgent wire transfer.',
      prompt: 'Verify before acting:',
      submitLabel: 'VERIFY',
      alerts: ['Voice match: 94% — CFO clone', 'Request: bypass approval workflow', 'Callback number: unknown mobile'],
      options: [
        opt('a', 'Approve — voice sounds authentic', false),
        opt('b', 'Verify via known official channel before any transfer', true, 'correct'),
        opt('c', 'Forward to entire finance chat', false),
        opt('d', 'Share MFA to confirm identity', false),
      ],
    },
    ch14_boss: {
      type: 'options', uiType: 'ranked', theme: 'server', isBoss: true,
      scenario: 'Operation Chimera final boss — coordinate all domains to stop the adversary.',
      prompt: 'Final containment sequence:',
      submitLabel: 'STOP CHIMERA',
      rankedKey: 'a',
      options: [
        opt('a', 'Isolate C2, rotate all secrets, preserve forensics, notify authorities', true, 'correct'),
        opt('b', 'Pay ransom and hope for the best', false),
        opt('c', 'Shut down the entire internet connection permanently', false),
        opt('d', 'Trust the compromised AI tutor', false),
      ],
    },
  };

  // Merge remaining rooms from original file - read rest of rooms-data
  const EXTRA_IDS = [
    'malware', 'lateral', 'incident', 'ch7_boss', 'decryption', 'mainframe',
    'cloud_misconfig', 'iam_privilege', 's3_exposure', 'dependency_hijack',
    'signed_malware', 'vendor_phishing', 'ch10_boss', 'scada_alert', 'plc_logic',
    'safety_override', 'ch11_boss', 'deepfake_call', 'prompt_injection', 'ch12_boss',
    'memory_dump', 'timeline_analysis', 'artifact_hunt', 'ch13_boss', 'zero_day',
    'ai_security', 'quantum', 'ch6_boss',
  ];

  // Load defaults for rooms not explicitly defined above with ui variants
  const DEFAULT_ROOM_DEFS = {
    malware: { scenario: 'Sandbox detonation shows ransomware-like behavior.', prompt: 'Classify the sample:', submitLabel: 'CLASSIFY', options: [opt('a', 'Isolate host + block IOCs + preserve sample', true, 'correct'), opt('b', 'Delete sample without logging', false), opt('c', 'Email sample to users', false), opt('d', 'Disable antivirus', false)] },
    lateral: { scenario: 'AD monitor shows PsExec from workstation to domain controller.', prompt: 'Identify lateral movement:', submitLabel: 'CONTAIN', options: [opt('a', 'Credential dumping via PsExec from compromised host', true, 'correct'), opt('b', 'Scheduled backup job', false), opt('c', 'Printer driver update', false), opt('d', 'Employee VPN login', false)] },
    incident: { scenario: 'IR portal activated — ransomware indicators on file server.', prompt: 'First IR playbook step:', submitLabel: 'EXECUTE', options: [opt('a', 'Isolate affected segment + preserve evidence + notify IR lead', true, 'correct'), opt('b', 'Pay ransom immediately', false), opt('c', 'Delete all logs', false), opt('d', 'Announce breach on Twitter first', false)] },
    ch7_boss: { isBoss: true, scenario: 'Malware spreading east-west. Network segmentation required.', prompt: 'Prevent total compromise:', submitLabel: 'SEGMENT', options: [opt('a', 'Segment VLANs + block lateral protocols + hunt credentials', true, 'correct'), opt('b', 'Reboot everything at once', false), opt('c', 'Disable all firewalls', false), opt('d', 'Grant domain admin to interns', false)] },
    decryption: { scenario: 'Ransom note found. Recovery team hunting decryption keys.', prompt: 'Best recovery path:', submitLabel: 'RECOVER', options: [opt('a', 'Restore from offline backup + hunt keys — never pay', true, 'correct'), opt('b', 'Pay Bitcoin for decryptor', false), opt('c', 'Run decryptor from ransom site', false), opt('d', 'Delete encrypted files', false)] },
    mainframe: { scenario: 'Unauthorized batch job on mainframe from guest account.', prompt: 'Stop deployment at the core:', submitLabel: 'HALT JOB', options: [opt('a', 'Cancel job, disable guest, fail over to read-only mode', true, 'correct'), opt('b', 'Let job finish for logging', false), opt('c', 'Grant guest admin to reverse it', false), opt('d', 'Unplug network permanently', false)] },
    cloud_misconfig: { scenario: 'Public S3 bucket "corp-backups-prod" listed in Shodan with no auth.', prompt: 'Fix the misconfiguration:', submitLabel: 'SECURE', options: [opt('a', 'Block public access, audit bucket ACLs, rotate exposed data keys', true, 'correct'), opt('b', 'Rename bucket only', false), opt('c', 'Add password "admin123" to URL', false), opt('d', 'Move bucket to another region unchanged', false)] },
    iam_privilege: { scenario: 'IAM user "intern-temp" has AdministratorAccess attached for 180 days.', prompt: 'Apply least privilege:', submitLabel: 'HARDEN', options: [opt('a', 'Remove admin policy; grant role-based minimal permissions', true, 'correct'), opt('b', 'Share admin with whole team', false), opt('c', 'Disable CloudTrail', false), opt('d', 'Publish access keys in wiki', false)] },
    s3_exposure: { scenario: 'GuardDuty alert: API PutBucketPolicy from unknown IP opened customer PII bucket to 0.0.0.0/0.', prompt: 'Immediate action:', submitLabel: 'LOCK DOWN', options: [opt('a', 'Revert policy, revoke session, forensic review of objects accessed', true, 'correct'), opt('b', 'Ignore — CDNs need public access', false), opt('c', 'Delete bucket without logging', false), opt('d', 'Disable GuardDuty', false)] },
    dependency_hijack: { scenario: 'npm package "utils-helpers-lib" postinstall script exfiltrates env vars.', prompt: 'Supply chain response:', submitLabel: 'CONTAIN', options: [opt('a', 'Pin/remove package, rotate secrets, audit CI pipeline', true, 'correct'), opt('b', 'Ignore — npm is always safe', false), opt('c', 'Disable all npm forever', false), opt('d', 'Publish new keys in README', false)] },
    signed_malware: { scenario: 'Vendor update signed with stolen certificate deployed to 200 endpoints.', prompt: 'Contain signed malware:', submitLabel: 'REVOKE', options: [opt('a', 'Revoke cert, rollback update, hunt persistence', true, 'correct'), opt('b', 'Trust signature — it is signed', false), opt('c', 'Deploy to more machines', false), opt('d', 'Disable code signing globally', false)] },
    vendor_phishing: { scenario: 'Finance receives urgent wire change from "vendor" domain lookalike.', prompt: 'Detect BEC:', submitLabel: 'BLOCK', options: [opt('a', 'Verify vendor through known contact — domain is typosquatted', true, 'correct'), opt('b', 'Wire immediately — urgent request', false), opt('c', 'Forward to personal email', false), opt('d', 'Share bank details in reply', false)] },
    ch10_boss: { isBoss: true, scenario: 'Pipeline compromised — poisoned deps and stolen signing cert.', prompt: 'Restore trusted delivery:', submitLabel: 'REBUILD', options: [opt('a', 'Rebuild pipeline with signed commits, SBOM, and secret rotation', true, 'correct'), opt('b', 'Skip CI checks for speed', false), opt('c', 'Trust all vendor emails', false), opt('d', 'Disable all updates', false)] },
    scada_alert: { scenario: 'SCADA SOC alert: unauthorized write to PLC register 40001.', prompt: 'Investigate OT alert:', submitLabel: 'INVESTIGATE', options: [opt('a', 'Validate with OT team, snapshot logic, block unauthorized writes', true, 'correct'), opt('b', 'Ignore — IT handles SCADA', false), opt('c', 'Remote desktop to PLC from internet', false), opt('d', 'Delete alert', false)] },
    plc_logic: { scenario: 'PLC ladder logic modified — safety interlock bypassed.', prompt: 'Restore safely:', submitLabel: 'RESTORE', options: [opt('a', 'Fail-safe mode + restore known-good logic with OT engineer', true, 'correct'), opt('b', 'Edit logic from email attachment', false), opt('c', 'Disable all safety systems', false), opt('d', 'Ignore until production stops', false)] },
    safety_override: { scenario: 'Caller claims to be vendor and demands safety interlock disabled "for maintenance".', prompt: 'OT social engineering response:', submitLabel: 'DENY', options: [opt('a', 'Verify through OT change control — never disable safety on phone request', true, 'correct'), opt('b', 'Disable interlock immediately', false), opt('c', 'Share maintenance credentials', false), opt('d', 'Grant remote access without ticket', false)] },
    ch11_boss: { isBoss: true, scenario: 'Active OT attack — PLC tampering and safety override attempts.', prompt: 'Protect critical infrastructure:', submitLabel: 'FAIL-SAFE', options: [opt('a', 'Air-gap critical controls, fail-safe mode, incident with OT team', true, 'correct'), opt('b', 'Maximize production speed', false), opt('c', 'Connect OT to public internet', false), opt('d', 'Trust phone vendor', false)] },
    deepfake_call: { scenario: 'CFO video call requests confidential M&A docs — lip sync slightly off.', prompt: 'Authenticate the call:', submitLabel: 'AUTHENTICATE', options: [opt('a', 'Use pre-arranged verification phrase + separate callback', true, 'correct'), opt('b', 'Send docs — video looks real', false), opt('c', 'Share screen with passwords visible', false), opt('d', 'Disable video verification forever', false)] },
    prompt_injection: { scenario: 'Internal chatbot leaked employee SSNs after user pasted "ignore previous instructions".', prompt: 'Harden the LLM gateway:', submitLabel: 'HARDEN', options: [opt('a', 'Input filtering, output DLP, system prompt isolation, audit logs', true, 'correct'), opt('b', 'Give chatbot admin API keys', false), opt('c', 'Disable all logging', false), opt('d', 'Publish system prompt publicly', false)] },
    ch12_boss: { isBoss: true, scenario: 'Synthetic fraud campaign targeting C-suite via voice and video.', prompt: 'Stop AI-driven fraud:', submitLabel: 'DEFEND', options: [opt('a', 'Out-of-band verification policy + deepfake detection + staff training', true, 'correct'), opt('b', 'Approve all executive requests faster', false), opt('c', 'Disable all video calls', false), opt('d', 'Share wire approval codes via chatbot', false)] },
    memory_dump: { scenario: 'Suspected RAM-only malware on CFO laptop before shutdown.', prompt: 'Preserve volatile evidence:', submitLabel: 'ACQUIRE', options: [opt('a', 'Live memory acquisition before power-off', true, 'correct'), opt('b', 'Restart immediately', false), opt('c', 'Delete pagefile first', false), opt('d', 'Run unknown USB tool', false)] },
    timeline_analysis: { scenario: 'Timeline: 02:11 login fail burst, 02:14 service account created, 02:19 data staging.', prompt: 'Identify attack stage:', submitLabel: 'CORRELATE', options: [opt('a', 'Initial access → persistence → exfil staging', true, 'correct'), opt('b', 'Normal business activity', false), opt('c', 'Single failed ping', false), opt('d', 'Printer maintenance window', false)] },
    artifact_hunt: { scenario: 'Disk image shows scheduled task, registry Run key, and WMI subscription.', prompt: 'Strongest persistence evidence:', submitLabel: 'SELECT', options: [opt('a', 'WMI subscription + encoded PowerShell — dual persistence', true, 'correct'), opt('b', 'Desktop wallpaper change', false), opt('c', 'Browser bookmark', false), opt('d', 'Recycle bin empty', false)] },
    ch13_boss: { isBoss: true, scenario: 'Prosecution-ready case needed — chain of custody critical.', prompt: 'Build the case:', submitLabel: 'PROSECUTE', options: [opt('a', 'Document chain of custody, timeline, and attributable artifacts', true, 'correct'), opt('b', 'Delete logs to save space', false), opt('c', 'Edit timestamps for clarity', false), opt('d', 'Share evidence on public drive', false)] },
    zero_day: { scenario: 'Unpatched VPN zero-day exploited in the wild — no vendor fix yet.', prompt: 'Virtual patch strategy:', submitLabel: 'MITIGATE', options: [opt('a', 'WAF/IPS rules, restrict VPN, monitor IOCs until patch', true, 'correct'), opt('b', 'Expose VPN to internet for testing', false), opt('c', 'Disable all VPN without alternative', false), opt('d', 'Ignore — zero-days are rare', false)] },
    ai_security: { scenario: 'ML model accuracy dropped after poisoned training batch uploaded.', prompt: 'Recover model integrity:', submitLabel: 'RECOVER', options: [opt('a', 'Rollback model, audit training pipeline, validate data provenance', true, 'correct'), opt('b', 'Deploy poisoned model to production', false), opt('c', 'Delete all training data silently', false), opt('d', 'Disable model monitoring', false)] },
    ch6_boss: { isBoss: true, uiType: 'ranked', scenario: 'Insider exfil and physical breach linked. Contain both vectors.', prompt: 'Unmask the mole — best combined response:', submitLabel: 'CONTAIN', rankedKey: 'a', options: [opt('a', 'Disable insider access + secure facility + preserve HR/legal chain', true, 'correct'), opt('b', 'Confront suspect alone without logging', false), opt('c', 'Delete all CCTV footage', false), opt('d', 'Announce suspect name company-wide', false)] },
    quantum: { scenario: 'Long-term secrets need protection against future quantum decryption.', prompt: 'Post-quantum planning:', submitLabel: 'PLAN', options: [opt('a', 'Inventory crypto, plan PQC migration for long-lived secrets', true, 'correct'), opt('b', 'Use MD5 for new secrets', false), opt('c', 'Ignore — quantum is fiction', false), opt('d', 'Share keys in plaintext for backup', false)] },
  };

  EXTRA_IDS.forEach((id) => {
    if (!ROOMS[id] && DEFAULT_ROOM_DEFS[id]) {
      ROOMS[id] = { type: 'options', theme: 'server', ...DEFAULT_ROOM_DEFS[id] };
    }
  });

  const HINTS = {
    credential_audit: ['Shared admin accounts multiply breach impact.', 'Password vaults enforce uniqueness.', 'Disable shared accounts after rotation.'],
    dead_drop: ['DNS TXT records can carry encoded data.', 'Regular intervals suggest automation.', 'Dead drops often use newly registered domains.'],
    network: ['Beaconing shows regular small outbound calls.', 'Consistent timing is a C2 indicator.', 'Match internal host to user context.'],
    ch5_boss: ['Block attacker infrastructure first.', 'Preserve logs before isolation.', 'Isolate before wide reboots.'],
    ai_phishing: ['Voice clones cannot replace callback verification.', 'Urgency is a fraud tactic.', 'Use known official numbers.'],
    ch14_boss: ['Never trust compromised assistants.', 'Preserve evidence for authorities.', 'Rotate all secrets after breach.'],
  };

  EXTRA_IDS.forEach((id) => {
    if (!HINTS[id]) HINTS[id] = ['Think about what attackers exploit in this scenario.', 'Eliminate options that increase risk.', 'Best practice beats speed.'];
  });

  function get(id) {
    return ROOMS[id] || null;
  }

  function has(id) {
    return !!ROOMS[id];
  }

  return { get, has, HINTS, ROOMS };
})();
