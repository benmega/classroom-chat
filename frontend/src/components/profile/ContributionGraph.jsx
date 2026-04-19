import React from 'react';

const ContributionGraph = ({ data }) => {
    if (!data || !data.rows) return <div className="no-data">No activity data available.</div>;

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
        <div className="contribution-container">
            <div className="graph-header">
                {data.months?.map((m, i) => (
                    <span key={i} className="month-label" style={{ gridColumn: `span ${m.colspan}` }}>
                        {m.name}
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
                                    key={cIdx} 
                                    className={`graph-cell level-${cell?.level || 0}`}
                                    title={`${cell?.count || 0} activity on ${cell?.date || 'unknown'}`}
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
