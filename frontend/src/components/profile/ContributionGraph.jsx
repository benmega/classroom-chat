import React from 'react';

// Padding cells (before the first / after the last day of the grid) are null: no tooltip for them.
const cellTitle = (cell) => {
    if (!cell) return undefined;
    const count = cell.count || 0;
    return `${count} ${count === 1 ? 'challenge' : 'challenges'} on ${cell.date}`;
};

const ContributionGraph = ({ data }) => {
    if (!data || !data.rows) return <div className="no-data">No activity data available.</div>;

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
        <div className="contribution-container">
            <div className="graph-header">
                {data.months?.map((m, i) => (
                    <span key={i} className="month-label" style={{ gridColumn: `span ${m.colspan}` }}>
                        {i === 0 && m.colspan <= 2 ? '' : m.name}
                    </span>
                ))}
            </div>
            <div className="graph-grid">
                <div className="weekday-labels">
                    {weekdays.map((d, i) => (
                        <span key={i} className="weekday-label">{i % 2 === 1 ? d : ''}</span>
                    ))}
                </div>
                <div className="rows-container">
                    {data.rows.map((row, rIdx) => (
                        <div key={rIdx} className="graph-row">
                            {row.map((cell, cIdx) => (
                                <div 
                                    key={cell?.date ?? cIdx}
                                    className={`graph-cell level-${cell?.level || 0}`}
                                    title={cellTitle(cell)}
                                ></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="graph-footer">
                <span>Less</span>
                <div className="footer-cells">
                    <div className="graph-cell level-0"></div>
                    <div className="graph-cell level-1"></div>
                    <div className="graph-cell level-2"></div>
                    <div className="graph-cell level-3"></div>
                    <div className="graph-cell level-4"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

export default ContributionGraph;
