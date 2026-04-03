/**
 * ResultSection 组件 - 分析结果展示
 */

interface ResultSectionProps {
  result: string;
}

export default function ResultSection({ result }: ResultSectionProps) {
  return (
    <section className="result-section">
      <div className="section-header">
        <h2>📋 分析结果</h2>
        <p className="section-description">来自 AI 导师的详细评估</p>
      </div>

      <div className="result-content">
        <pre className="result-text">{result}</pre>
      </div>
    </section>
  );
}
