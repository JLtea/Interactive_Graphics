/**
 * @file Particle
 */

/** Class implementing Particle. */
class Particle {

    /**
     * Initialize members of a Particle object
     */
    constructor() {
        this.position = [0.0, 0.0, 0.0];
        this.velocity = [0.0, 0.0, 0.0];
        this.acceleration = [0.0, -9.8, 0.0];

        this.color = [0.0, 0.0, 0.0];
        this.radius = 1.0;
        this.mass = 1.0;
        this.drag = 0.15;

        this.boxBoundMax = 1;
        this.boxBoundMin = -1;

        // update the particle parameters randomly
        this.position[0] = Math.random() * 2 - 1;
        this.position[1] = Math.random() * 2 - 1;
        this.position[2] = Math.random() * 2 - 1;
        this.velocity[0] = Math.random() * 6 - 3;
        this.velocity[1] = Math.random() * 6 - 3;
        this.velocity[2] = Math.random() * 6 - 3;
        this.color = vec3.fromValues(Math.random(), Math.random(), Math.random());
        this.radius = Math.random() * 0.15 + 0.02;
        this.mass = Math.random() + 0.5;
    }

     /**
      * updated velocity with Euler
      * @param delta_t Time elapsed
      */
     update_velocity(delta_t) {
         this.velocity[0] = (this.velocity[0] * ((1 - drag) ** delta_t)) + (this.acceleration[0] * delta_t);
         this.velocity[1] = (this.velocity[1] * ((1 - drag) ** delta_t)) + (this.acceleration[1] * delta_t);
         this.velocity[2] = (this.velocity[2] * ((1 - drag) ** delta_t)) + (this.acceleration[2] * delta_t);
     }

     //----------------------------------------------------------------------------------
     /**
      * updated position with Euler
      * @param delta_t Time elapsed
      */
     update_position(delta_t) {
         this.position[0] += this.velocity[0] * delta_t;
         this.position[1] += this.velocity[1] * delta_t;
         this.position[2] += this.velocity[2] * delta_t;
     }

     /**
      * Detects and resolves sphere-wall collision
      * @param delta_t Time elapsed
      */
     resolve_collision(delta_t) {
         var max = this.boxBoundMax - this.radius;
         var min = this.boxBoundMin - this.radius;
         for (var i = 0; i < 3; i++) {
             if (this.position[i] <= min) {
                 this.position[i] = min;
                 this.velocity[i] *= -1;
             }
             if (this.position[i] >= max) {
                 this.position[i] = max;
                 this.velocity[i] *= -1;
             }
         }
     }
}