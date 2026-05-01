import React from 'react';
import { Code } from 'lucide-react';

const TechnicalSkills = ({ skills }) => {
    if (!skills || skills.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <h2><Code size={20} /> Technical Skills</h2>
            </div>
            <div className="skill-grid-container">
                <div className="skill-grid">
                    {skills.filter(s => s.category !== 'concept').map(skill => (
                        <div key={skill.id} className={`skill-card proficiency-${skill.proficiency}`}>
                            <i className={skill.icon}></i>
                            <span>{skill.name}</span>
                            <div className="skill-level">Lvl {skill.proficiency}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TechnicalSkills;
