mod bus;
mod config;
mod cost;
mod memory;
mod plugin;
mod task;

use clap::{Parser, Subcommand};

// ── CLI ───────────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(name = "yamtam-rt", version = "0.6.0", about = "YAMTAM Runtime — task · bus · memory · config · plugin · cost")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Task lifecycle — create, track, complete with evidence
    Task   { #[command(subcommand)] action: TaskAction },
    /// Evaluate task evidence against schema
    Eval   { #[command(subcommand)] action: EvalAction },
    /// Agent message bus — emit, read, reply, inbox
    Bus    { #[command(subcommand)] action: BusAction },
    /// L3 shared memory — workspace-level facts across sessions
    Memory { #[command(subcommand)] action: MemoryAction },
    /// Configuration — init/read yamtam settings for any repo
    Config { #[command(subcommand)] action: ConfigAction },
    /// Plugin hooks — register custom guards without forking
    Plugin { #[command(subcommand)] action: PluginAction },
    /// Cost dashboard — token usage and spend tracking
    Cost   { #[command(subcommand)] action: CostAction },
}

// ── Subcommand enums ──────────────────────────────────────────────────────────

#[derive(Subcommand)]
enum TaskAction {
    /// Create a new task
    Create { name: String, #[arg(long)] scope: Option<String> },
    /// List all tasks
    List,
    /// Mark a task done with evidence
    Done { id: String, #[arg(long)] evidence: String },
    /// Show task details
    Status { id: String },
    /// Remove a task
    Drop { id: String },
}

#[derive(Subcommand)]
enum EvalAction {
    /// Validate task evidence against schema
    Run { id: String },
    /// Show the evidence schema
    Schema,
}

#[derive(Subcommand)]
enum BusAction {
    /// Emit an event onto the bus
    Emit { from: String, to: String, #[arg(name = "type")] event_type: String, payload: String },
    /// Read events from the bus
    Read {
        #[arg(long)] agent: Option<String>,
        #[arg(long)] since: Option<String>,
        #[arg(long)] reply_to: Option<String>,
        #[arg(long, default_value_t = 20)] last: usize,
    },
    /// Reply to an existing event
    Reply { original_id: String, from: String, payload: String },
    /// Show inbox for an agent
    Inbox { agent: String },
}

#[derive(Subcommand)]
enum MemoryAction {
    /// Store a fact in L3
    Store {
        key: String, value: String,
        #[arg(long)] tag: Vec<String>,
        #[arg(long)] agent: Option<String>,
        #[arg(long, default_value = "medium")] confidence: String,
        #[arg(long, default_value = "both")] scope: String,
    },
    /// Get a fact by key
    Get { key: String },
    /// List facts
    List {
        #[arg(long)] tag: Option<String>,
        #[arg(long)] agent: Option<String>,
        #[arg(long, default_value_t = 20)] last: usize,
    },
    /// Promote L3 fact → L1 atomic .md file
    Promote { key: String, #[arg(long, default_value = "memory/L1_atomic")] l1_dir: String },
    /// Import L2 session facts into L3
    Import { #[arg(long, default_value = "memory/L2_session")] l2_dir: String },
}

#[derive(Subcommand)]
enum ConfigAction {
    Show { #[arg(long, default_value = ".")] dir: String },
    Init { #[arg(long, default_value = ".")] dir: String },
    Set  { key: String, value: String, #[arg(long, default_value = ".")] dir: String },
}

#[derive(Subcommand)]
enum PluginAction {
    List,
    Add     { name: String, script: String, #[arg(long, default_value = "")] description: String },
    Remove  { name: String },
    Enable  { name: String },
    Disable { name: String },
    Run     { name: String, #[arg(long)] input: Option<String> },
}

#[derive(Subcommand)]
enum CostAction {
    Show,
    Log {
        task: String, tier: String, model: String,
        input_tokens: u64, output_tokens: u64,
        #[arg(long)] duration_ms: Option<u64>,
    },
    Breakdown { #[arg(default_value = "tier")] by: String },
}

// ── main ─────────────────────────────────────────────────────────────────────

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::Task { action } => match action {
            TaskAction::Create { name, scope }    => task::cmd_task_create(name, scope),
            TaskAction::List                       => task::cmd_task_list(),
            TaskAction::Done { id, evidence }     => task::cmd_task_done(id, evidence),
            TaskAction::Status { id }             => task::cmd_task_status(id),
            TaskAction::Drop { id }               => task::cmd_task_drop(id),
        },
        Commands::Eval { action } => match action {
            EvalAction::Run { id } => task::cmd_eval_run(id),
            EvalAction::Schema     => task::cmd_eval_schema(),
        },
        Commands::Bus { action } => match action {
            BusAction::Emit { from, to, event_type, payload } =>
                bus::cmd_bus_emit(from, to, event_type, payload),
            BusAction::Read { agent, since, reply_to, last } =>
                bus::cmd_bus_read(agent, since, reply_to, last),
            BusAction::Reply { original_id, from, payload } =>
                bus::cmd_bus_reply(original_id, from, payload),
            BusAction::Inbox { agent } => bus::cmd_bus_inbox(agent),
        },
        Commands::Memory { action } => match action {
            MemoryAction::Store { key, value, tag, agent, confidence, scope } =>
                memory::cmd_memory_store(key, value, tag, agent, confidence, scope),
            MemoryAction::Get { key }                   => memory::cmd_memory_get(key),
            MemoryAction::List { tag, agent, last }     => memory::cmd_memory_list(tag, agent, last),
            MemoryAction::Promote { key, l1_dir }       => memory::cmd_memory_promote(key, l1_dir),
            MemoryAction::Import { l2_dir }             => memory::cmd_memory_import(l2_dir),
        },
        Commands::Config { action } => match action {
            ConfigAction::Show { dir }            => config::cmd_config_show(dir),
            ConfigAction::Init { dir }            => config::cmd_config_init(dir),
            ConfigAction::Set { key, value, dir } => config::cmd_config_set(dir, key, value),
        },
        Commands::Plugin { action } => match action {
            PluginAction::List                          => plugin::cmd_plugin_list(),
            PluginAction::Add { name, script, description } =>
                plugin::cmd_plugin_add(name, script, description),
            PluginAction::Remove  { name }              => plugin::cmd_plugin_remove(name),
            PluginAction::Enable  { name }              => plugin::cmd_plugin_toggle(name, true),
            PluginAction::Disable { name }              => plugin::cmd_plugin_toggle(name, false),
            PluginAction::Run { name, input }           => plugin::cmd_plugin_run(name, input),
        },
        Commands::Cost { action } => match action {
            CostAction::Show                            => cost::cmd_cost_show(),
            CostAction::Log { task, tier, model, input_tokens, output_tokens, duration_ms } =>
                cost::cmd_cost_log(task, tier, model, input_tokens, output_tokens, duration_ms),
            CostAction::Breakdown { by }               => cost::cmd_cost_breakdown(by),
        },
    }
}
