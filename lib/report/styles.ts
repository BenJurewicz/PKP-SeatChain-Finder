export const REPORT_STYLES = `
  :root {
    --bg: #0f172a;
    --card: #1e293b;
    --card-hover: #334155;
    --border: #475569;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --accent: #3b82f6;
    --warning: #f59e0b;
    --success: #22c55e;
    --error: #ef4444;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .trip-header {
    background: var(--card);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }
  
  .trip-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .carrier-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }
  
  .trip-title h1 {
    font-size: 24px;
    font-weight: 700;
  }
  
  .trip-route {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .trip-route .station {
    font-weight: 600;
  }
  
  .trip-route .arrow {
    margin: 0 12px;
    color: var(--text-muted);
  }
  
  .trip-details {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  
  .trip-time {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .trip-time .label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .trip-time .value {
    font-size: 16px;
    font-weight: 600;
  }
  
  .summary-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .summary-card {
    background: var(--card);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  
  .summary-label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  
  .summary-value {
    font-size: 28px;
    font-weight: 700;
  }
  
  .summary-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  
  .traveler-section {
    background: var(--card);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }
  
  .traveler-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  
  .timeline {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
  }
  
  .timeline-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .timeline-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    min-width: 140px;
  }
  
  .timeline-station {
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .timeline-time {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  
  .timeline-seat {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  
  .timeline-meta {
    font-size: 12px;
    color: var(--text-muted);
  }
  
  .timeline-arrow {
    display: flex;
    align-items: center;
    font-size: 20px;
    color: var(--text-muted);
    padding-top: 40px;
  }
  
  .detailed-section {
    margin-top: 32px;
  }
  
  .detailed-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  .detailed-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .detailed-table th,
  .detailed-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  
  .detailed-table th {
    background: rgba(0, 0, 0, 0.2);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  
  .detailed-table .traveler-header {
    text-align: center;
    color: var(--text);
  }
  
  .detailed-table .time-cell {
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  
  .status-ok {
    color: var(--success);
    font-weight: 600;
  }
  
  .status-collision {
    color: var(--error);
    font-weight: 600;
  }
  
  .detailed-table tbody tr:hover {
    background: var(--card-hover);
  }
  
  @media (max-width: 640px) {
    main { padding: 12px; }
    .timeline { flex-direction: column; }
    .timeline-arrow { display: none; }
    .trip-details { flex-direction: column; gap: 12px; }
    .detailed-table { font-size: 14px; }
    .detailed-table th, .detailed-table td { padding: 8px 10px; }
  }
  
  @media print {
    body { background: white; color: black; }
    .trip-header, .summary-card, .traveler-section, .detailed-table { 
      background: white; 
      border: 1px solid #ddd;
    }
    .timeline-card { border: 1px solid #ddd; }
  }
`;