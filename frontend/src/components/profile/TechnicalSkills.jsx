import React from 'react';
import { Code } from 'lucide-react';

const TechnicalSkills = ({ skills }) => {
    const visibleSkills = skills?.filter(s => s.category !== 'concept') || [];
    if (visibleSkills.length === 0) return null;

    const iconMap = {
        "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
        "JavaScript": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
        "HTML/CSS": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
        "Java": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
        "C++": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg",
        "Git & GitHub": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg",
    };

    const getTooltipText = (skill) => {
        if (skill.category === 'language') {
            if (skill.proficiency === 1) return `Level 1: Completed 10+ challenges in ${skill.name}`;
            if (skill.proficiency === 2) return `Level 2: Completed 50+ challenges in ${skill.name}`;
            if (skill.proficiency === 3) return `Level 3: Completed 100+ challenges in ${skill.name}`;
        }
        if (skill.category === 'tool' && skill.name === 'Git & GitHub') {
            return "Awarded for linking a GitHub repository to a project.";
        }
        return `Awarded for proficiency in ${skill.name}.`;
    };

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <h2><Code size={20} /> Technical Skills</h2>
            </div>
            <div className="skill-grid-container">
                <div className="skill-grid">
                    {visibleSkills.map(skill => (
                        <div 
                            key={skill.id} 
                            className={`tech-skill-card proficiency-${skill.proficiency}`}
                            title={getTooltipText(skill)}
                        >
                            {iconMap[skill.name] ? (
                                <img src={iconMap[skill.name]} alt={`${skill.name} icon`} />
                            ) : (
                                <Code size={36} className="fallback-icon" />
                            )}
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
