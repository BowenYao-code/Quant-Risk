/**
 * Quantitative Risk Management Platform - Black-Scholes Option Pricing Model
 * 
 * Professional JavaScript implementation including complete option pricing, Greeks calculation,
 * Monte Carlo simulation and advanced risk management features
 * 
 * Author: Bowen Yao
 * Email: bowenyao984@gmail.com
 * Purpose: Demonstrate quantitative finance and JavaScript programming capabilities
 * Date: 2025
 */

/**
 * Black-Scholes Option Pricing Model Core Class
 * Implements complete BSM framework including option pricing and Greeks calculation
 */
class BlackScholesModel {
    /**
     * Constructor
     * @param {number} S - Current underlying asset price
     * @param {number} K - Option strike price
     * @param {number} T - Time to expiry (years)
     * @param {number} r - Risk-free rate (annualized)
     * @param {number} sigma - Volatility (annualized)
     */
    constructor(S, K, T, r, sigma) {
        this.S = S;
        this.K = K;
        this.T = T;
        this.r = r;
        this.sigma = sigma;
        
        // Pre-calculate d1 and d2 for performance
        this._calculateD1D2();
    }

    /**
     * Standard normal cumulative distribution function (CDF)
     * Uses Abramowitz and Stegun approximation algorithm, accuracy ~7.5e-8
     * @param {number} x - Input value
     * @returns {number} Cumulative probability
     */
    normalCDF(x) {
        // Constant definitions
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        // Save the sign of x
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        // A&S formula 7.1.26
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * y);
    }

    /**
     * Standard normal probability density function (PDF)
     * @param {number} x - Input value
     * @returns {number} Probability density
     */
    normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    /**
     * Calculate d1 and d2 parameters
     * d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
     * d2 = d1 - σ√T
     * @private
     */
    _calculateD1D2() {
        if (this.T <= 0 || this.sigma <= 0) {
            throw new Error('Time and volatility must be positive numbers');
        }
        
        const sqrtT = Math.sqrt(this.T);
        this.d1 = (Math.log(this.S / this.K) + (this.r + 0.5 * this.sigma * this.sigma) * this.T) / 
                   (this.sigma * sqrtT);
        this.d2 = this.d1 - this.sigma * sqrtT;
    }

    /**
     * Calculate European call option price
     * Call = S₀N(d₁) - Ke^(-rT)N(d₂)
     * @returns {number} Call option price
     */
    callPrice() {
        const Nd1 = this.normalCDF(this.d1);
        const Nd2 = this.normalCDF(this.d2);
        const discountFactor = Math.exp(-this.r * this.T);
        
        return this.S * Nd1 - this.K * discountFactor * Nd2;
    }

    /**
     * Calculate European put option price
     * Put = Ke^(-rT)N(-d₂) - S₀N(-d₁)
     * @returns {number} Put option price
     */
    putPrice() {
        const NminusD1 = this.normalCDF(-this.d1);
        const NminusD2 = this.normalCDF(-this.d2);
        const discountFactor = Math.exp(-this.r * this.T);
        
        return this.K * discountFactor * NminusD2 - this.S * NminusD1;
    }

    /**
     * Calculate Delta - option price sensitivity to underlying price
     * Call Delta = N(d₁)
     * Put Delta = N(d₁) - 1
     * @param {string} optionType - 'call' or 'put'
     * @returns {number} Delta value
     */
    delta(optionType = 'call') {
        const Nd1 = this.normalCDF(this.d1);
        return optionType.toLowerCase() === 'call' ? Nd1 : Nd1 - 1;
    }

    /**
     * Calculate Gamma - Delta sensitivity to underlying price
     * Gamma = φ(d₁) / (S₀σ√T)
     * @returns {number} Gamma value (same for calls and puts)
     */
    gamma() {
        const phiD1 = this.normalPDF(this.d1);
        return phiD1 / (this.S * this.sigma * Math.sqrt(this.T));
    }

    /**
     * Calculate Theta - option price sensitivity to time (time decay)
     * @param {string} optionType - 'call' or 'put'
     * @returns {number} Theta value (daily)
     */
    theta(optionType = 'call') {
        const phiD1 = this.normalPDF(this.d1);
        const sqrtT = Math.sqrt(this.T);
        const discountFactor = Math.exp(-this.r * this.T);
        
        const term1 = -(this.S * phiD1 * this.sigma) / (2 * sqrtT);
        
        if (optionType.toLowerCase() === 'call') {
            const term2 = -this.r * this.K * discountFactor * this.normalCDF(this.d2);
            return (term1 + term2) / 365; // Convert to daily Theta
        } else {
            const term2 = this.r * this.K * discountFactor * this.normalCDF(-this.d2);
            return (term1 + term2) / 365; // Convert to daily Theta
        }
    }

    /**
     * Calculate Vega - option price sensitivity to volatility
     * Vega = S₀φ(d₁)√T
     * @returns {number} Vega value (1% volatility change impact)
     */
    vega() {
        const phiD1 = this.normalPDF(this.d1);
        return this.S * phiD1 * Math.sqrt(this.T) / 100; // Divide by 100 for 1% change
    }

    /**
     * Calculate Rho - option price sensitivity to risk-free rate
     * @param {string} optionType - 'call' or 'put'
     * @returns {number} Rho value (1% rate change impact)
     */
    rho(optionType = 'call') {
        const discountFactor = Math.exp(-this.r * this.T);
        const value = this.K * this.T * discountFactor;
        
        if (optionType.toLowerCase() === 'call') {
            return value * this.normalCDF(this.d2) / 100;
        } else {
            return -value * this.normalCDF(-this.d2) / 100;
        }
    }

    /**
     * Get all Greeks
     * @param {string} optionType - 'call' or 'put'
     * @returns {Object} Object containing all Greeks
     */
    getAllGreeks(optionType = 'call') {
        return {
            delta: this.delta(optionType),
            gamma: this.gamma(),
            theta: this.theta(optionType),
            vega: this.vega(),
            rho: this.rho(optionType)
        };
    }

    /**
     * Verify put-call parity relationship
     * Call - Put = S₀ - Ke^(-rT)
     * @returns {Object} Parity relationship verification results
     */
    putCallParity() {
        const callPrice = this.callPrice();
        const putPrice = this.putPrice();
        const parityLeft = callPrice - putPrice;
        const parityRight = this.S - this.K * Math.exp(-this.r * this.T);
        const difference = Math.abs(parityLeft - parityRight);
        
        return {
            holds: difference < 0.0001,
            difference: difference,
            leftSide: parityLeft,
            rightSide: parityRight
        };
    }

    /**
     * Calculate option moneyness
     * @returns {Object} Moneyness information
     */
    moneyness() {
        const ratio = this.S / this.K;
        let status, description;
        
        if (ratio > 1.05) {
            status = 'ITM';
            description = 'In-the-Money';
        } else if (ratio < 0.95) {
            status = 'OTM';
            description = 'Out-of-the-Money';
        } else {
            status = 'ATM';
            description = 'At-the-Money';
        }
        
        return {
            ratio: ratio,
            status: status,
            description: description
        };
    }

    /**
     * Calculate option intrinsic and time value
     * @param {string} optionType - 'call' or 'put'
     * @returns {Object} Value decomposition
     */
    valueDecomposition(optionType = 'call') {
        const optionPrice = optionType.toLowerCase() === 'call' ? this.callPrice() : this.putPrice();
        let intrinsicValue;
        
        if (optionType.toLowerCase() === 'call') {
            intrinsicValue = Math.max(this.S - this.K, 0);
        } else {
            intrinsicValue = Math.max(this.K - this.S, 0);
        }
        
        const timeValue = Math.max(optionPrice - intrinsicValue, 0);
        
        return {
            optionPrice: optionPrice,
            intrinsicValue: intrinsicValue,
            timeValue: timeValue,
            timeValueRatio: optionPrice > 0 ? timeValue / optionPrice : 0
        };
    }
}

/**
 * Monte Carlo option pricing simulation
 * Uses geometric Brownian motion to simulate underlying asset price paths
 * @param {number} S - Current underlying price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry
 * @param {number} r - Risk-free rate
 * @param {number} sigma - Volatility
 * @param {number} numSimulations - Number of simulations
 * @param {boolean} useAntithetic - Whether to use antithetic variable variance reduction
 * @returns {Object} Monte Carlo pricing results
 */
function monteCarloSimulation(S, K, T, r, sigma, numSimulations = 50000, useAntithetic = true) {
    let callPayoffSum = 0;
    let putPayoffSum = 0;
    let callPayoffs = [];
    let putPayoffs = [];
    
    const actualSimulations = useAntithetic ? numSimulations / 2 : numSimulations;
    
    for (let i = 0; i < actualSimulations; i++) {
        // Generate standard normal random numbers (Box-Muller transform)
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        
        // Calculate terminal underlying price
        const drift = (r - 0.5 * sigma * sigma) * T;
        const diffusion = sigma * Math.sqrt(T) * z;
        const ST = S * Math.exp(drift + diffusion);
        
        // Calculate option payoffs
        const callPayoff = Math.max(ST - K, 0);
        const putPayoff = Math.max(K - ST, 0);
        
        callPayoffSum += callPayoff;
        putPayoffSum += putPayoff;
        callPayoffs.push(callPayoff);
        putPayoffs.push(putPayoff);
        
        // Antithetic variable variance reduction technique
        if (useAntithetic) {
            const ST_anti = S * Math.exp(drift - diffusion);
            const callPayoff_anti = Math.max(ST_anti - K, 0);
            const putPayoff_anti = Math.max(K - ST_anti, 0);
            
            callPayoffSum += callPayoff_anti;
            putPayoffSum += putPayoff_anti;
            callPayoffs.push(callPayoff_anti);
            putPayoffs.push(putPayoff_anti);
        }
    }
    
    // Discount to present value
    const discountFactor = Math.exp(-r * T);
    const callPrice = (callPayoffSum / numSimulations) * discountFactor;
    const putPrice = (putPayoffSum / numSimulations) * discountFactor;
    
    // Calculate standard error and confidence intervals
    const callStdError = calculateStandardError(callPayoffs, discountFactor);
    const putStdError = calculateStandardError(putPayoffs, discountFactor);
    
    const confidenceLevel = 1.96; // 95% confidence interval
    const callCI = confidenceLevel * callStdError;
    const putCI = confidenceLevel * putStdError;
    
    return {
        callPrice: callPrice,
        putPrice: putPrice,
        callStandardError: callStdError,
        putStandardError: putStdError,
        callConfidenceInterval: callCI,
        putConfidenceInterval: putCI,
        numSimulations: numSimulations,
        useAntithetic: useAntithetic
    };
}

/**
 * Calculate standard error
 * @param {Array} payoffs - Payoff array
 * @param {number} discountFactor - Discount factor
 * @returns {number} Standard error
 */
function calculateStandardError(payoffs, discountFactor) {
    const n = payoffs.length;
    const mean = payoffs.reduce((sum, x) => sum + x, 0) / n;
    const variance = payoffs.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
    return Math.sqrt(variance / n) * discountFactor;
}

/**
 * Implied Volatility Calculator
 * Uses Newton-Raphson method to solve for implied volatility
 * @param {number} marketPrice - Market option price
 * @param {number} S - Underlying price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry
 * @param {number} r - Risk-free rate
 * @param {string} optionType - Option type
 * @param {number} maxIterations - Maximum iterations
 * @param {number} tolerance - Convergence tolerance
 * @returns {Object} Implied volatility results
 */
function calculateImpliedVolatility(marketPrice, S, K, T, r, optionType = 'call', maxIterations = 100, tolerance = 1e-6) {
    let sigma = 0.3; // Initial guess
    let iterations = 0;
    let converged = false;
    
    // Boundary checks
    if (marketPrice <= 0) {
        throw new Error('Market price must be positive');
    }
    
    // Check intrinsic value
    const intrinsicValue = optionType.toLowerCase() === 'call' ? 
        Math.max(S - K, 0) : Math.max(K - S, 0);
    
    if (marketPrice < intrinsicValue) {
        throw new Error('Market price cannot be below intrinsic value');
    }
    
    for (let i = 0; i < maxIterations; i++) {
        iterations = i + 1;
        
        try {
            const bs = new BlackScholesModel(S, K, T, r, sigma);
            const theoreticalPrice = optionType.toLowerCase() === 'call' ? 
                bs.callPrice() : bs.putPrice();
            const vega = bs.vega() * 100; // Convert to unit change
            
            const priceDiff = theoreticalPrice - marketPrice;
            
            // Check convergence
            if (Math.abs(priceDiff) < tolerance) {
                converged = true;
                break;
            }
            
            // Check if Vega is too small (avoid division by zero)
            if (Math.abs(vega) < 1e-10) {
                break;
            }
            
            // Newton-Raphson update
            const newSigma = sigma - priceDiff / vega;
            
            // Ensure volatility stays within reasonable range
            sigma = Math.max(0.001, Math.min(5.0, newSigma));
            
        } catch (error) {
            break;
        }
    }
    
    return {
        impliedVolatility: sigma,
        impliedVolatilityPercent: sigma * 100,
        iterations: iterations,
        converged: converged,
        tolerance: tolerance
    };
}

// Export modules (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BlackScholesModel,
        monteCarloSimulation,
        calculateImpliedVolatility
    };
}

// Global availability (browser environment)
if (typeof window !== 'undefined') {
    window.BlackScholesModel = BlackScholesModel;
    window.monteCarloSimulation = monteCarloSimulation;
    window.calculateImpliedVolatility = calculateImpliedVolatility;
}